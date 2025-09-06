package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.List;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int K_FACTOR = 32;
    public static final int ELO_DIVIDER = 400;
    public static final double POINT_IMPACT_FLOOR = 0.5D;

    public static void calculateElo(List<PlayerStatisticsDto> blueTeam, List<PlayerStatisticsDto> redTeam) {
        // sum of elos of the team divided by team members
        var avgBlue = blueTeam.stream()
                .mapToDouble(PlayerStatisticsDto::getElo)
                .average()
                .orElse(STARTING_ELO);
        var avgRed = redTeam.stream()
                .mapToDouble(PlayerStatisticsDto::getElo)
                .average()
                .orElse(STARTING_ELO);

        var expectedBlue = expectedScore(avgBlue, avgRed);
        var expectedRed = 1 - expectedBlue;

        // sum of points scored by the team members
        var totalBluePoints = blueTeam.stream()
                .mapToLong(PlayerStatisticsDto::getPoints)
                .sum();
        var totalRedPoints = redTeam.stream()
                .mapToLong(PlayerStatisticsDto::getPoints)
                .sum();

        // save result for both teams: 1=win, 0.5=draw, 0=loose
        double resultBlue, resultRed;

        if (totalBluePoints == totalRedPoints) {
            resultBlue = resultRed = 0.5;
        } else if (totalBluePoints > totalRedPoints) {
            resultBlue = 1.0;
            resultRed = 0.0;
        } else {
            resultBlue = 0.0;
            resultRed = 1.0;
        }

        // calculate the elo for every player of both teams
        calcElo(blueTeam, avgBlue, avgRed, totalBluePoints, totalRedPoints, resultBlue);
        calcElo(redTeam, avgRed, avgBlue, totalRedPoints, totalBluePoints, resultRed);
    }

    private static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    private static void calcElo(List<PlayerStatisticsDto> team,
                                double teamAvgElo,
                                double opponentAvgElo,
                                long teamPoints,
                                long opponentPoints,
                                double gameResult) { // 1.0 win, 0.0 loss, 0.5 draw
        if (team == null || team.isEmpty()) return;

        final int n = team.size();

        final double BASE = POINT_IMPACT_FLOOR;      // e.g., 0.5
        double mov = 1.0;
        if (gameResult == 1.0 || gameResult == 0.0) {
            long margin = Math.abs(teamPoints - opponentPoints);
            long denom  = Math.max(1L, Math.max(teamPoints, opponentPoints));
            double r = Math.min(1.0, Math.max(0.0, (double) margin / denom));
            mov = BASE + (1.0 - BASE) * r;
        }

        double expectedTeam = 1.0 / (1.0 + Math.pow(10.0, (opponentAvgElo - teamAvgElo) / 400.0));

        double teamDelta = K_FACTOR * mov * (gameResult - expectedTeam);
        double perPlayer = teamDelta / n;

        if (gameResult == 1.0) {
            team.forEach(PlayerStatisticsDto::addWin);
        }
        for (var p : team) {
            p.setElo(p.getElo() + perPlayer);
        }
    }


}
