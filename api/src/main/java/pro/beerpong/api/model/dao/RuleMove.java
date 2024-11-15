package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "rule_moves")
@Data
public class RuleMove {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private int multiplicator;

    @ManyToOne
    @JoinColumn(name = "rulesetId")
    private Ruleset ruleset;
}
