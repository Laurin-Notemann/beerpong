package pro.beerpong.api.util;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Elo engine with team-vs-team, per-player score shares, and per-player
 * expectations.
 * Ported from the provided TypeScript reference.
 */
public final class EloAlgorithm {

    // ---------- Types ----------
    public enum MatchOutcome {
        A, B, DRAW
    }

    public static final class EloConfig {
        public double K = 42; // 32 + 10
        public double alpha = 1.7; // 0.7 + 1
        public double initialRating = 1000;
        public double scale = 500; // 400 + 100
        public double beta = 1.5; // 0.5 + 1

        public EloConfig() {
        }

        public EloConfig setK(double k) {
            this.K = k;
            return this;
        }

        public EloConfig setAlpha(double a) {
            this.alpha = a;
            return this;
        }

        public EloConfig setInitialRating(double r) {
            this.initialRating = r;
            return this;
        }

        public EloConfig setScale(double s) {
            this.scale = s;
            return this;
        }

        public EloConfig setBeta(double b) {
            this.beta = b;
            return this;
        }
    }

    public static final class PlayerResult {
        public final String id;
        public final double points; // non-negative; used for intra-team share

        public PlayerResult(String id, double points) {
            this.id = id;
            this.points = points;
        }
    }

    public static final class TeamResult {
        public final List<PlayerResult> players;

        public TeamResult(List<PlayerResult> players) {
            this.players = players == null ? List.of() : List.copyOf(players);
        }
    }

    public static final class Match {
        public final TeamResult teamA;
        public final TeamResult teamB;
        public final MatchOutcome outcome;

        public Match(TeamResult a, TeamResult b, MatchOutcome outcome) {
            this.teamA = a;
            this.teamB = b;
            this.outcome = outcome;
        }
    }

    // Ratings map: playerId -> rating
    public interface Ratings extends Map<String, Double> {
    }

    private static class RatingsImpl extends HashMap<String, Double> implements Ratings {
        RatingsImpl() {
        }

        RatingsImpl(Map<String, Double> base) {
            super(base);
        }
    }

    // ---------- Core ----------
    public static Ratings rateMatch(Map<String, Double> ratingsIn, Match match, EloConfig cfg) {
        EloConfig C = cfg == null ? new EloConfig() : cfg;
        Ratings out = new RatingsImpl(ratingsIn);

        double ra = teamRating(out, match.teamA, C.initialRating);
        double rb = teamRating(out, match.teamB, C.initialRating);

        double Ea = expectedScore(ra, rb, C.scale);
        double Eb = 1.0 - Ea;

        double Sa = teamScore(match.outcome, "A");
        double Sb = 1.0 - Sa;

        List<Double> sA = shares(match.teamA);
        List<Double> sB = shares(match.teamB);
        int nA = Math.max(1, match.teamA.players.size());
        int nB = Math.max(1, match.teamB.players.size());

        // Per-player expectations (team expected ± deviation by own Elo)
        List<Double> Ea_i = playerExpecteds(out, match.teamA, C.initialRating, Ea, C.scale, C.beta);
        List<Double> Eb_i = playerExpecteds(out, match.teamB, C.initialRating, Eb, C.scale, C.beta);

        double alphaA = alphaForTeam(nA, C.alpha);
        double alphaB = alphaForTeam(nB, C.alpha);

        // Team A players
        for (int i = 0; i < match.teamA.players.size(); i++) {
            PlayerResult p = match.teamA.players.get(i);
            double r = get(out, p.id, C.initialRating);
            double Si = Sa + alphaA * (sA.get(i) - 1.0 / nA);
            double delta = (C.K / nA) * (Si - Ea_i.get(i));
            out.put(p.id, r + delta);
        }

        // Team B players
        for (int i = 0; i < match.teamB.players.size(); i++) {
            PlayerResult p = match.teamB.players.get(i);
            double r = get(out, p.id, C.initialRating);
            double Si = Sb + alphaB * (sB.get(i) - 1.0 / nB);
            double delta = (C.K / nB) * (Si - Eb_i.get(i));
            out.put(p.id, r + delta);
        }

        return out;
    }

    public static Ratings rateMatches(Map<String, Double> initial, List<Match> matches, EloConfig cfg) {
        Ratings curr = new RatingsImpl(initial);
        for (Match m : matches) {
            curr = rateMatch(curr, m, cfg);
        }
        return curr;
    }

    public static final class History {
        public final Ratings finalRatings;
        public final List<Ratings> snapshots; // after each match

        public History(Ratings finalRatings, List<Ratings> snapshots) {
            this.finalRatings = finalRatings;
            this.snapshots = snapshots;
        }
    }

    public static History rateMatchesWithHistory(Map<String, Double> initial, List<Match> matches, EloConfig cfg) {
        Ratings curr = new RatingsImpl(initial);
        List<Ratings> hist = new ArrayList<>();
        for (Match m : matches) {
            curr = rateMatch(curr, m, cfg);
            hist.add(new RatingsImpl(curr)); // snapshot
        }
        return new History(curr, hist);
    }

    // ---------- Helpers (1:1 with TS) ----------
    private static double get(Map<String, Double> ratings, String id, double init) {
        Double v = ratings.get(id);
        return (v != null && Double.isFinite(v)) ? v : init;
    }

    private static double teamRating(Map<String, Double> ratings, TeamResult team, double init) {
        int n = team.players.size();
        if (n == 0)
            return init;
        double sum = 0.0;
        for (PlayerResult p : team.players)
            sum += get(ratings, p.id, init);
        return sum / n; // average prevents team-size advantage
    }

    private static double expectedScore(double ra, double rb, double scale) {
        return 1.0 / (1.0 + Math.pow(10.0, (rb - ra) / scale));
    }

    private static double teamScore(MatchOutcome outcome, String which) {
        if (outcome == MatchOutcome.DRAW)
            return 0.5;
        return (outcome == MatchOutcome.A && "A".equals(which)) ||
                (outcome == MatchOutcome.B && "B".equals(which)) ? 1.0 : 0.0;
    }

    private static List<Double> shares(TeamResult team) {
        int n = Math.max(1, team.players.size());
        double sumPts = team.players.stream()
                .mapToDouble(p -> Math.max(0.0, p.points))
                .sum();
        if (sumPts > 0) {
            return team.players.stream()
                    .map(p -> Math.max(0.0, p.points) / sumPts)
                    .collect(Collectors.toUnmodifiableList());
        }
        double equal = 1.0 / n;
        List<Double> eq = new ArrayList<>(team.players.size());
        for (int i = 0; i < team.players.size(); i++)
            eq.add(equal);
        return Collections.unmodifiableList(eq);
    }

    private static List<Double> playerExpecteds(
            Map<String, Double> ratings,
            TeamResult team,
            double init,
            double teamExpected,
            double scale,
            double beta) {
        int n = Math.max(1, team.players.size());
        double rBar;
        if (team.players.isEmpty()) {
            rBar = init;
        } else {
            double sum = 0.0;
            for (PlayerResult p : team.players)
                sum += get(ratings, p.id, init);
            rBar = sum / n;
        }
        List<Double> Ei = new ArrayList<>(team.players.size());
        for (PlayerResult p : team.players) {
            double ri = get(ratings, p.id, init);
            double e = teamExpected + beta * ((ri - rBar) / scale);
            // clamp to [0,1]
            if (e < 0)
                e = 0;
            else if (e > 1)
                e = 1;
            Ei.add(e);
        }
        return Collections.unmodifiableList(Ei);
    }

    private static double alphaForTeam(int n, double alpha) {
        return Math.min(1.0, alpha * (n / 2.0));
    }

    // ---------- Adapters for your existing DTOs ----------
    /**
     * Minimal DTO contract we need. If your PlayerStatisticsDto already has these,
     * use the second overload below and adjust the lambdas.
     */
    public interface PlayerSnapshot {
        String id();

        double elo();

        void setElo(double newElo);

        double points(); // within-team points for this match (used for shares); use 0 for equal split
    }

    /**
     * Rate one match and directly mutate players' Elo in-place.
     * Outcome is inferred from total team points.
     */
    public static void updateElosInPlace(
            List<? extends PlayerSnapshot> teamA,
            List<? extends PlayerSnapshot> teamB,
            EloConfig cfg) {
        // Build ratings map from current ELOs
        Map<String, Double> ratings = new HashMap<>();
        teamA.forEach(p -> ratings.put(p.id(), p.elo()));
        teamB.forEach(p -> ratings.put(p.id(), p.elo()));

        // Build match from snapshots
        double sumA = teamA.stream().mapToDouble(PlayerSnapshot::points).sum();
        double sumB = teamB.stream().mapToDouble(PlayerSnapshot::points).sum();
        MatchOutcome outcome = (sumA == sumB) ? MatchOutcome.DRAW : (sumA > sumB ? MatchOutcome.A : MatchOutcome.B);

        Match match = new Match(
                new TeamResult(
                        teamA.stream().map(p -> new PlayerResult(p.id(), p.points())).collect(Collectors.toList())),
                new TeamResult(
                        teamB.stream().map(p -> new PlayerResult(p.id(), p.points())).collect(Collectors.toList())),
                outcome);

        Ratings after = rateMatch(ratings, match, cfg);

        // Write back
        teamA.forEach(p -> p.setElo(after.getOrDefault(p.id(), cfg == null ? 1000.0 : cfg.initialRating)));
        teamB.forEach(p -> p.setElo(after.getOrDefault(p.id(), cfg == null ? 1000.0 : cfg.initialRating)));
    }

    /**
     * If your existing PlayerStatisticsDto looks like:
     * String getPlayerId(); double getElo(); void setElo(double);
     * long getPointsThisMatch(); // per-player contribution (if you have it)
     * …then you can adapt like this:
     */
    public static <T> void updateElosInPlace(
            List<T> blueTeam,
            List<T> redTeam,
            EloConfig cfg,
            java.util.function.Function<T, String> idOf,
            java.util.function.ToDoubleFunction<T> eloOf,
            java.util.function.ObjDoubleConsumer<T> setElo,
            java.util.function.ToDoubleFunction<T> pointsOf // return 0 for equal-share
    ) {
        List<PlayerSnapshot> A = blueTeam.stream().map(x -> new PlayerSnapshot() {
            @Override
            public String id() {
                return idOf.apply(x);
            }

            @Override
            public double elo() {
                return eloOf.applyAsDouble(x);
            }

            @Override
            public void setElo(double newElo) {
                setElo.accept(x, newElo);
            }

            @Override
            public double points() {
                return pointsOf.applyAsDouble(x);
            }
        }).collect(Collectors.toList());

        List<PlayerSnapshot> B = redTeam.stream().map(x -> new PlayerSnapshot() {
            @Override
            public String id() {
                return idOf.apply(x);
            }

            @Override
            public double elo() {
                return eloOf.applyAsDouble(x);
            }

            @Override
            public void setElo(double newElo) {
                setElo.accept(x, newElo);
            }

            @Override
            public double points() {
                return pointsOf.applyAsDouble(x);
            }
        }).collect(Collectors.toList());

        updateElosInPlace(A, B, cfg);
    }

}
