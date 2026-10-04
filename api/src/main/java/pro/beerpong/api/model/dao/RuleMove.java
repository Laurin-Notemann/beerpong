package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pro.beerpong.api.model.RuleMoveCups;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rule_moves")
public class RuleMove {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private int pointsForTeam;

    private int pointsForScorer;

    private boolean finishingMove;

    /** Cups this move takes off the table; null on rows from before the column existed. */
    private Integer cups;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    private Season season;

    public int cupsPerHit() {
        return cups != null ? cups : RuleMoveCups.defaultFor(name, finishingMove);
    }
}
