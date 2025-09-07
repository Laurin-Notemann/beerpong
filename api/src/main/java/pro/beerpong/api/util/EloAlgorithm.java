package pro.beerpong.api.util;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

import java.util.Arrays;
import java.util.List;

public class EloAlgorithm {

    public static final int STARTING_ELO = 1500;
    public static final int K_FACTOR = 32;
    public static final int ELO_DIVIDER = 400;
    private static final double PERF_BLEND = 0.70;
    private static final double BONUS_SCALE = 8.0;
    private static final double MARGIN_SCALE = 1.0;
    
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

    /**
     * Distributes Elo changes to each player on a team based on:
     *  - team expected vs actual (using average team Elos)
     *  - player share of team points (normalized by team size)
     *  - a small zero-sum bonus for outperforming expected share (based on teammates' Elos)
     *
     * This keeps the system fair across different team sizes and rewards individual performance.
     *
     * @param team             The team whose players will be updated
     * @param avgTeamElo       The average Elo of this team
     * @param avgOppElo        The average Elo of the opponent team
     * @param teamPoints       Sum of this team's points in the match
     * @param oppPoints        Sum of opponent's points in the match
     * @param matchResult      1.0 win, 0.5 draw, 0.0 loss (used as fallback if total points == 0)
     */
    private static void calcElo(
            List<PlayerStatisticsDto> team,
            double avgTeamElo,
            double avgOppElo,
            long teamPoints,
            long oppPoints,
            double matchResult
    ) {
        final int teamSize = Math.max(1, team.size());

        double expectedTeam = expectedScore(avgTeamElo, avgOppElo);

        long totalPoints = teamPoints + oppPoints;
        double actualTeam = (totalPoints > 0) ? (double) teamPoints / (double) totalPoints : matchResult;

        double marginMultiplier = 1.0;
        if (totalPoints > 0 && MARGIN_SCALE > 0.0) {
            double margin = Math.abs(teamPoints - oppPoints) / (double) totalPoints;
            marginMultiplier = 1.0 + MARGIN_SCALE * margin;
        }

        double teamDelta = K_FACTOR * (actualTeam - expectedTeam) * marginMultiplier;

        double[] share = new double[teamSize];
        double[] expect = softmaxEloShares(team);

        if (teamPoints > 0) {
            for (int i = 0; i < teamSize; i++) {
                long pi = safePoints(team.get(i));
                share[i] = (double) pi / (double) teamPoints;
            }
        } else {
            Arrays.fill(share, 1.0 / teamSize);
        }

        double[] weights = new double[teamSize];
        double equal = 1.0 / teamSize;
        for (int i = 0; i < teamSize; i++) {
            weights[i] = (1.0 - PERF_BLEND) * equal + PERF_BLEND * share[i];
        }

        normalizeToOne(weights);

        double[] bonus = new double[teamSize];

        if (BONUS_SCALE != 0.0) {
            for (int i = 0; i < teamSize; i++) {
                bonus[i] = BONUS_SCALE * (share[i] - expect[i]);
            }
            recenterToZero(bonus);
        }

        for (int i = 0; i < teamSize; i++) {
            PlayerStatisticsDto p = team.get(i);
            double delta = teamDelta * weights[i] + bonus[i];
            p.setElo(p.getElo() + delta);
        }
    }

    private static double expectedScore(double elo1, double elo2) {
        // source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system
        return 1.0D / (1.0D + Math.pow(10.0D, (elo2 - elo1) / ELO_DIVIDER));
    }

    private static long safePoints(PlayerStatisticsDto p) {
        long pts = p.getPoints();
        return Math.max(0L, pts);
    }

    private static double[] softmaxEloShares(List<PlayerStatisticsDto> team) {
        int n = team.size();
        double[] w = new double[n];

        double maxElo = team.stream().mapToDouble(PlayerStatisticsDto::getElo).max().orElse(0.0);
        double sum = 0.0;
        for (int i = 0; i < n; i++) {
            double e = team.get(i).getElo();
            // Base-10 exponent with 400 divisor (Elo convention)
            w[i] = Math.pow(10.0, (e - maxElo) / 400.0);
            sum += w[i];
        }
        if (sum <= 0.0) {
            Arrays.fill(w, 1.0 / n);
            return w;
        }
        for (int i = 0; i < n; i++) w[i] /= sum;
        return w;
    }

    private static void normalizeToOne(double[] arr) {
        double s = 0.0;
        for (double v : arr) s += v;
        if (s == 0.0) return;
        for (int i = 0; i < arr.length; i++) arr[i] /= s;
    }

    private static void recenterToZero(double[] arr) {
        double s = 0.0;
        for (double v : arr) s += v;
        double avg = s / arr.length;
        for (int i = 0; i < arr.length; i++) arr[i] -= avg;
    }
}
