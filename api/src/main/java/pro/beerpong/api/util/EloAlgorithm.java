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

    private static void calcElo(List<PlayerStatisticsDto> team, double exp, long teamPoints, long opponentPoints, double gameResult) {
        team.forEach(player -> {
            double pointRatio;
            double usefulness;

            if (gameResult == 1.0D) {
                player.addWin();
            }

            // if you play solo you receive more elo when you win with a higher point difference
            if (team.size() == 1) {
                if (gameResult == 1.0D || gameResult == 0.0D) {
                    // calc margin between team points and opponentPoints
                    long margin = Math.abs(teamPoints - opponentPoints);
                    // divide the margin with the bigger one of the two points.
                    // if you win you receive more elo if you win with a bigger difference
                    // if you loose you receive more minus elo if you loose with a bigger difference
                    pointRatio = margin / (double) Math.max(teamPoints, opponentPoints);

                    // clip pointRatio between 0.0 and 1.0
                    pointRatio = Math.max(0.0, Math.min(1.0, pointRatio));
                    usefulness = POINT_IMPACT_FLOOR + (1 - POINT_IMPACT_FLOOR) * pointRatio;
                } else {
                    pointRatio = 1.0D;
                    usefulness = 1.0D;
                }
            } else {
                // if you play in a team you receive more elo when you contribute to your teams total points
                pointRatio = (teamPoints == 0) ? 0.0 : ((double) player.getPoints() / teamPoints);

                // if the team has won: the higher usefulness, the higher the elo gain
                if (gameResult == 1.0D) {
                    // you receive at least 50% of your elo. you receive the other 50% based on how much you contributed to your team
                    usefulness = POINT_IMPACT_FLOOR + (1 - POINT_IMPACT_FLOOR) * pointRatio;
                    // if the team lost: the lower usefulness, the less elo you loose
                } else if (gameResult == 0.0D) {
                    // you loose at least 50% of your minus elo. you receive more of the 50% the less you contributed to the team
                    usefulness = POINT_IMPACT_FLOOR + (1 - POINT_IMPACT_FLOOR) * (1.0D - pointRatio);
                } else {
                    // everything else: you just receive your (minus-)elo
                    usefulness = 1.0D;
                }
            }

            // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
            double eloChange = K_FACTOR * (gameResult - exp) * usefulness;

            player.setElo(player.getElo() + eloChange);
        });
    }
}
