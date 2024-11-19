package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.SneakyThrows;

import java.util.List;

@Entity(name = "rule_moves")
@Data
public class RuleMove implements Cloneable {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private int pointsForTeam;

    private int pointsForScorer;

    private boolean finishingMove;

    @ManyToOne
    @JoinColumn(name = "season_id")
    private Season season;

    @OneToMany(mappedBy = "move")
    private List<MatchMove> matchMoves;

    @Override
    @SneakyThrows
    public RuleMove clone() {
        return (RuleMove) super.clone();
    }
}