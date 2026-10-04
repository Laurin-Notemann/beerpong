package pro.beerpong.api.model;

import java.util.Map;

/**
 * How many cups a move takes off the table. The match score is the sum of these, so a won match
 * ends at 10: a Bouncer takes two cups, a Bomb one (it's worth two points, not two cups), the
 * last cup is entered as a normal hit and the finish on top of it adds none, a Save (the last
 * hit in overtime) adds none, and the rings take their whole formation.
 */
public final class RuleMoveCups {
    private static final Map<String, Integer> BY_NAME = Map.of(
            "Normal", 1,
            "Bomb", 1,
            "Bouncer", 2,
            "Trickshot", 1,
            "Save", 0,
            "Finish - Normal", 0,
            "Finish - Ring of fire", 4,
            "Finish - Ring of water", 6
    );

    private RuleMoveCups() {
    }

    /** For moves that never had a cup count: the default moves by name, otherwise 1 (a finish 0). */
    public static int defaultFor(String name, boolean finishingMove) {
        return BY_NAME.getOrDefault(name, finishingMove ? 0 : 1);
    }
}
