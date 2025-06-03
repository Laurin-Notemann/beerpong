package pro.beerpong.api.util;

import java.util.List;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int K_FACTOR = 32;
    public static final int ELO_DIVIDER = 400;

    public static double expectedScore(double elo1, double elo2) {
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

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

        var expectedBlue = EloAlgorithm.expectedScore(avgBlue, avgRed);
        var expectedRed = 1 - expectedBlue;

        // sum of points scored by the team members
        var totalBluePoints = blueTeam.stream()
                .mapToLong(PlayerStatisticsDto::getPoints)
                .sum();
        var totalRedPoints = redTeam.stream()
                .mapToLong(PlayerStatisticsDto::getPoints)
                .sum();

        double actualBlue, actualRed;

        if (totalBluePoints == totalRedPoints) {
            actualBlue = actualRed = 0.5;
        } else if (totalBluePoints > totalRedPoints) {
            actualBlue = 1.0;
            actualRed = 0.0;
        } else {
            actualBlue = 0.0;
            actualRed = 1.0;
        }

        blueTeam.forEach(player -> {
            // how much the player contributed to their team's score
            // if the team scored 0 points, usefulness is 0 to avoid division by zero
            double usefulness = (totalBluePoints == 0) ? 0.0 : ((double) player.getPoints() / totalBluePoints);

            double ratingChange = EloAlgorithm.K_FACTOR * (actualBlue - expectedBlue) * usefulness;

            double newElo = player.getElo() + ratingChange;

            player.setElo(newElo);

        });

        redTeam.forEach(player -> {
            double usefulness = (totalRedPoints == 0) ? 0.0 : ((double) player.getPoints() / totalRedPoints);

            double ratingChange = EloAlgorithm.K_FACTOR * (actualRed - expectedRed) * usefulness;

            double newElo = player.getElo() + ratingChange;

            player.setElo(newElo);

        });
    }

}
