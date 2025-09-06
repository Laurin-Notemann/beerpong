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
        calcElo(blueTeam, expectedBlue, totalBluePoints, totalRedPoints, resultBlue);
        calcElo(redTeam, expectedRed, totalRedPoints, totalBluePoints, resultRed);
    }

    private static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    private static void calcElo(List<PlayerStatisticsDto> team,
                                double expectedTeamScore,
                                long teamPoints,
                                long opponentPoints,
                                double gameResult) {
        if (team == null || team.isEmpty()) {
            return;
        }

        final int n = team.size();
        final double BASE = POINT_IMPACT_FLOOR;

        if (gameResult == 1.0D) {
            team.forEach(PlayerStatisticsDto::addWin);
        }

        double mov = 1.0D;

        if (gameResult == 1.0D || gameResult == 0.0D) {
            long margin = Math.abs(teamPoints - opponentPoints);
            long denom = Math.max(1L, Math.max(teamPoints, opponentPoints));

            double ratio = Math.min(1.0D, Math.max(0.0D, (double) margin / denom));

            mov = BASE + (1.0D - BASE) * ratio;
        }

        double teamDelta = K_FACTOR * mov * (gameResult - expectedTeamScore);

        double perPlayerDelta = teamDelta / n;

        for (PlayerStatisticsDto p : team) {
            p.setElo(p.getElo() + perPlayerDelta);
        }
    }

}
