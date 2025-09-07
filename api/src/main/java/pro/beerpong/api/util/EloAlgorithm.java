package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.List;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int K_FACTOR = 32;
    public static final int ELO_DIVIDER = 400;

    public static void calculateElo(List<PlayerStatisticsDto> blueTeam, List<PlayerStatisticsDto> redTeam, long blueTeamPoints, long redTeamPoints) {
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

        // save result for both teams: 1=win, 0.5=draw, 0=loose
        double resultBlue, resultRed;

        if (blueTeamPoints == redTeamPoints) {
            resultBlue = resultRed = 0.5;
        } else if (blueTeamPoints > redTeamPoints) {
            resultBlue = 1.0;
            resultRed = 0.0;
        } else {
            resultBlue = 0.0;
            resultRed = 1.0;
        }

        // calculate the elo for every player of both teams
        calcElo(blueTeam, expectedBlue, resultBlue);
        calcElo(redTeam, expectedRed, resultRed);
    }

    private static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    private static void calcElo(List<PlayerStatisticsDto> team, double opponentAvg, double gameResult) {
        team.forEach(player -> {
            // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
            double eloChange = K_FACTOR * (gameResult - expectedScore(player.getElo(), opponentAvg));

            player.setElo(player.getElo() + eloChange);
        });
    }
}
