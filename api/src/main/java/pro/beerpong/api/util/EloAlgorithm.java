package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EloAlgorithm {
    public static final int STARTING_ELO = 1500;
    public static final int ELO_DIVIDER = 400;

    public static final double K_TEAM = 48.0; // Wertung von Ergebnis-Upsets
    public static final double K_PERF = 18.0; // individuelle Über/Unterperformance

    public static final double ALPHA = 0.5; // Blend: 1/n vs. Softmax(Elo)
    public static final double BETA = 0.02; // Softmax-Schärfe. Wieviel wird von besseren Spielern mehr erwartet
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

        // Expected Shares an den Teampunkten berechnen
        Map<String, Double> expShare = new HashMap<>();
        expectedShare(blueTeamStats, expShare);
        expectedShare(redTeamStats, expShare);

        // Tatsächliche Anteile an den Teampunkten
        Map<String, Double> actShare = new HashMap<>();
        actualShare(blueTeamStats, playerPoints, teamBluePoints, actShare);
        actualShare(redTeamStats, playerPoints, teamRedPoints, actShare);

        // Deltas anwenden und Elo berechnen
        applyDeltas(blueTeamStats, resultBlue, eloAvgRed, expShare, actShare);
        applyDeltas(redTeamStats, resultRed, eloAvgBlue, expShare, actShare);
    }

    private static void applyDeltas(List<PlayerStatisticsDto> players,
                                    double result,
                                    double eloAvgOpp,
                                    Map<String, Double> expShare,
                                    Map<String, Double> actShare) {
        for (PlayerStatisticsDto p : players) {
            double expVsOpp = expectedScore(p.getElo(), eloAvgOpp);
            double deltaTeam = K_TEAM * (result - expVsOpp);

            double dShare = (actShare.getOrDefault(p.getPlayerId(), 0.0)
                    - expShare.getOrDefault(p.getPlayerId(), 0.0));
            double deltaPerformance = K_PERF * dShare;

            double eloChange = Math.max(-CAP_PER_PLAYER, Math.min(CAP_PER_PLAYER, deltaTeam + deltaPerformance));

            p.setElo(p.getElo() + eloChange);
        }
    }

    private static double averageElo(List<PlayerStatisticsDto> players) {
        return players.stream()
                .mapToDouble(PlayerStatisticsDto::getElo)
                .average()
                .orElse(STARTING_ELO);
    }

    public static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    public static void expectedShare(
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
            if (sum == 0) {
                out.put(players.get(i).getPlayerId(), 0D);
            } else {
                out.put(players.get(i).getPlayerId(), shares[i] / sum);
            }
        }
    }

    public static void actualShare(
            List<PlayerStatisticsDto> players,
            Map<String, Long> playerPoints,
            long teamPoints,
            Map<String, Double> out
    ) {
        for (PlayerStatisticsDto p : players) {
            double pts = playerPoints.getOrDefault(p.getPlayerId(), 0L);

            if (teamPoints == 0) {
                out.put(p.getPlayerId(), 0D);
            } else {
                out.put(p.getPlayerId(), pts / teamPoints);
            }
        }
    }
}
