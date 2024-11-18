package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.SneakyThrows;

@Entity(name = "rule_moves")
@Data
public class RuleMove {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private int pointsForTeam;

    private int pointsForScorer;

    private boolean finishingMove;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;

    @SneakyThrows
    @Override
    public RuleMove clone() {
        var ruleMove = new RuleMove();

        ruleMove.setId(id);
        ruleMove.setName(name);
        ruleMove.setPointsForTeam(pointsForTeam);
        ruleMove.setPointsForScorer(pointsForScorer);
        ruleMove.setFinishingMove(finishingMove);
        ruleMove.setSeason(season);

        return ruleMove;
    }
}
