package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int ELO_DIVIDER = 400;

    public static final double K_TEAM = 24.0;   // Wertung von Ergebnis-Upsets
    public static final double K_PERF = 12.0;   // individuelle Über/Unterperformance
    public static final double ALPHA = 0.5;    // Blend: 1/n vs. Softmax(Elo)
    public static final double BETA = 0.004;  // Softmax-Schärfe. Wieviel wird von besseren Spielern mehr erwartet
    public static final double EPS = 0.25;   // Glättung für tatsächliche Anteile
    public static final double CAP_PER_PLAYER = 40.0;   // Max Elo gain pro Spiel

    public static final double SOFTMAX_CLAMP_FLOOR = 0.05;
    public static final double SOFTMAX_CLAMP_CEIL = 0.9;

    public static void calculateElo(
            long teamBluePoints,
            long teamRedPoints,
            List<PlayerStatisticsDto> blueTeamStats,
            List<PlayerStatisticsDto> redTeamStats,
            Map<PlayerStatisticsDto, Long> playerPoints
    ) {
        // Game-Result berechnen
        double resultBlue = teamBluePoints == teamRedPoints ? 0.5 : (teamBluePoints > teamRedPoints ? 1.0 : 0.0);
        double resultRed = 1.0 - resultBlue;

        // Elo-Durchschnitte
        double eloAvgBlue = averageElo(blueTeamStats);
        double eloAvgRed = averageElo(redTeamStats);

        // Expected-Results
        double expectedBlue = expectedScore(eloAvgBlue, eloAvgRed);
        double expectedRed = 1.0 - expectedBlue;

        // Expected Shares an den Teampunkten berechnen
        Map<PlayerStatisticsDto, Double> expShare = new HashMap<>();
        expectedShare(blueTeamStats, expShare);
        expectedShare(redTeamStats, expShare);

        // Tatsächliche Anteile an den Teampunkten
        Map<PlayerStatisticsDto, Double> actShare = new HashMap<>();
        actualShare(blueTeamStats, playerPoints, teamBluePoints, actShare);
        actualShare(redTeamStats, playerPoints, teamRedPoints, actShare);

        // Ergebnis-Upsets (wie ein Team entsprechend zu ihrem erwarteten Ergebnis performt hat)
        // Positiv -> besser als erwartet, Negativ -> schlechter als erwartet, Null -> genau wie erwartet
        double deltaTeamBlue = K_TEAM * (resultBlue - expectedBlue);
        double deltaTeamRed = K_TEAM * (resultRed - expectedRed);

        // Über/Unterperformance des Teams (wie ungewöhnlich das Math-Ergebnis war)
        // Überperformances in solchen Upset-Spielen werden stärker belohnt
        double scaleBlue = (0.5 + Math.abs(resultBlue - expectedBlue));
        double scaleRed = (0.5 + Math.abs(resultRed - expectedRed));

        Map<PlayerStatisticsDto, Double> delta = new HashMap<>();

        // Sieger: + (act - exp); Verlierer: - (act - exp); Unentschieden: 0
        double signBlue = resultBlue == 1.0 ? +1.0 : (resultBlue == 0.0 ? -1.0 : 0.0);
        double signRed = -signBlue;

        for (PlayerStatisticsDto p : blueTeamStats) {
            double d = (actShare.getOrDefault(p, 0.0) - expShare.getOrDefault(p, 0.0));
            delta.put(p, K_PERF * scaleBlue * signBlue * d);
        }

        for (PlayerStatisticsDto p : redTeamStats) {
            double d = (actShare.getOrDefault(p, 0.0) - expShare.getOrDefault(p, 0.0));
            delta.put(p, K_PERF * scaleRed * signRed * d);
        }

        // Performance des Teams auf 0 renormieren
        renormToZero(blueTeamStats, delta);
        renormToZero(redTeamStats, delta);

        // Delta anwenden: Elo nach expShare verteilen + Performance-Term addieren
        applyDeltas(blueTeamStats, expShare, deltaTeamBlue, delta);
        applyDeltas(redTeamStats, expShare, deltaTeamRed, delta);
    }

    private static double averageElo(List<PlayerStatisticsDto> players) {
        return players.stream()
                .mapToDouble(PlayerStatisticsDto::getElo)
                .average()
                .orElse(STARTING_ELO);
    }

    private static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    private static void expectedShare(
            List<PlayerStatisticsDto> players,
            Map<PlayerStatisticsDto, Double> out
    ) {
        if (players.isEmpty()) {
            return;
        }

        // Amount of players
        int n = players.size();

        // Softmax(Elo)
        double[] logits = new double[n];
        double sumExp = 0.0;

        for (int i = 0; i < n; i++) {
            double elo = players.get(i).getElo();
            double e = Math.exp(BETA * elo);

            logits[i] = e;
            sumExp += e;
        }

        // Blend + Clamp, damit von niemandem 0%/100% erwartet wird
        double[] shares = new double[n];
        double sum = 0.0;

        for (int i = 0; i < n; i++) {
            double soft = logits[i] / (sumExp > 0 ? sumExp : 1.0);
            double blended = (1.0 - ALPHA) * (1.0 / n) + ALPHA * soft;
            //TODO maybe change floor/ceil based on team sizes
//            double floor = Math.max(0.02, 0.25 / n);
//            double ceil  = Math.min(0.90, 1.0 - (n - 1) * floor);

            blended = Math.max(SOFTMAX_CLAMP_FLOOR, Math.min(SOFTMAX_CLAMP_CEIL, blended));

            shares[i] = blended;
            sum += blended;
        }

        // renorm auf 1
        for (int i = 0; i < n; i++) {
            out.put(players.get(i), shares[i] / sum);
        }
    }

    private static void actualShare(
            List<PlayerStatisticsDto> players,
            Map<PlayerStatisticsDto, Long> playerPoints,
            long teamPoints,
            Map<PlayerStatisticsDto, Double> out
    ) {
        // Anzahl an Spielern
        int n = Math.max(1, players.size());

        // Spieler-Punkte mit Glättung, damit man immer etwas plus/minus bekommt
        double denom = teamPoints + n * EPS;

        for (PlayerStatisticsDto p : players) {
            double pts = playerPoints.getOrDefault(p, 0L) + EPS;

            // Tatsächlichen Anteil berechnen inkl. minimaler Glättung
            out.put(p, pts / denom);
        }
    }

    private static void renormToZero(List<PlayerStatisticsDto> players, Map<PlayerStatisticsDto, Double> deltas) {
        if (players.isEmpty()) {
            return;
        }

        double sum = players.stream().mapToDouble(p -> deltas.getOrDefault(p, 0.0)).sum();
        double mean = sum / players.size();

        for (PlayerStatisticsDto p : players) {
            deltas.put(p, deltas.getOrDefault(p, 0.0) - mean);
        }
    }

    private static void applyDeltas(
            List<PlayerStatisticsDto> players,
            Map<PlayerStatisticsDto, Double> expShare,
            double deltaTeam,
            Map<PlayerStatisticsDto, Double> deltaPerf
    ) {
        for (PlayerStatisticsDto p : players) {
            double dt = deltaTeam * expShare.getOrDefault(p, 0.0);
            double dp = deltaPerf.getOrDefault(p, 0.0);

            double d = dt + dp;

            // Ergebnis cappen, um komplette Blowouts zu vermeiden
            if (d > CAP_PER_PLAYER) {
                d = CAP_PER_PLAYER;
            }
            if (d < -CAP_PER_PLAYER) {
                d = -CAP_PER_PLAYER;
            }

            p.setElo(p.getElo() + d);
        }
    }

}
