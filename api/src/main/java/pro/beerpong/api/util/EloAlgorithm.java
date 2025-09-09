package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int ELO_DIVIDER = 400;

    public static final double K_TEAM = 48.0; // Wertung von Ergebnis-Upsets
    public static final double K_PERF = 12.0; // individuelle Über/Unterperformance
    public static final double ALPHA = 0.5; // Blend: 1/n vs. Softmax(Elo)
    public static final double BETA = 0.015; // Softmax-Schärfe. Wieviel wird von besseren Spielern mehr erwartet
    public static final double EPS = 0.25; // Glättung für tatsächliche Anteile
    public static final double CAP_PER_PLAYER = 40.0; // Max Elo gain pro Spiel

    public static final double SOFTMAX_CLAMP_FLOOR = 0.05;
    public static final double SOFTMAX_CLAMP_CEIL = 0.9;

    public static void calculateElo(
            long teamBluePoints,
            long teamRedPoints,
            List<PlayerStatisticsDto> blueTeamStats,
            List<PlayerStatisticsDto> redTeamStats,
            Map<String, Long> playerPoints
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
        Map<String, Double> expShare = new HashMap<>();
        expectedShare(blueTeamStats, expShare);
        expectedShare(redTeamStats, expShare);

        // Tatsächliche Anteile an den Teampunkten
        Map<String, Double> actShare = new HashMap<>();
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

        Map<String, Double> delta = new HashMap<>();

        // Sieger: + (act - exp); Verlierer: - (act - exp); Unentschieden: 0
        double signBlue = resultBlue == 1.0 ? +1.0 : (resultBlue == 0.0 ? -1.0 : 0.0);
        double signRed = -signBlue;

        for (PlayerStatisticsDto p : blueTeamStats) {
            double d = (actShare.getOrDefault(p.getId(), 0.0) - expShare.getOrDefault(p.getId(), 0.0));
            delta.put(p.getId(), K_PERF * scaleBlue * d);
        }

        for (PlayerStatisticsDto p : redTeamStats) {
            double d = (actShare.getOrDefault(p.getId(), 0.0) - expShare.getOrDefault(p.getId(), 0.0));
            delta.put(p.getId(), K_PERF * scaleRed * d);
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

    static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    static void expectedShare(
            List<PlayerStatisticsDto> players,
            Map<String, Double> out
    ) {
        if (players.isEmpty()) return;

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
            //TODO maybe make clamp floor/ceil dynamic based on team size
//            double floor = Math.max(0.02, 0.25 / n);   // ca. 12.5% bei 2er-Team, 8.3% bei 3er, 5% bei 5er, 2.5% bei 10er
//            double ceil  = Math.min(0.90, 1.0 - (n - 1) * floor);  // garantiert machbar

            blended = Math.max(SOFTMAX_CLAMP_FLOOR, Math.min(SOFTMAX_CLAMP_CEIL, blended));

            shares[i] = blended;
            sum += blended;
        }

        // renorm auf 1
        for (int i = 0; i < n; i++) {
            out.put(players.get(i).getId(), shares[i] / sum);
        }
    }

    static void actualShare(
            List<PlayerStatisticsDto> players,
            Map<String, Long> playerPoints,
            long teamPoints,
            Map<String, Double> out
    ) {
        for (PlayerStatisticsDto p : players) {
            double pts = playerPoints.getOrDefault(p.getId(), 0L);

            out.put(p.getId(), pts / teamPoints);
        }
    }

    private static void renormToZero(List<PlayerStatisticsDto> players, Map<String, Double> deltas) {
        if (players.isEmpty()) {
            return;
        }

        double sum = players.stream().mapToDouble(p -> deltas.getOrDefault(p.getId(), 0.0)).sum();
        double mean = sum / players.size();

        for (PlayerStatisticsDto p : players) {
            deltas.put(p.getId(), deltas.getOrDefault(p.getId(), 0.0) - mean);
        }
    }

    private static void applyDeltas(
            List<PlayerStatisticsDto> players,
            Map<String, Double> expShare,
            double deltaTeam,
            Map<String, Double> deltaPerf
    ) {
        for (PlayerStatisticsDto p : players) {
            double dt = deltaTeam * expShare.getOrDefault(p.getId(), 0.0);
            double dp = deltaPerf.getOrDefault(p.getId(), 0.0);

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
