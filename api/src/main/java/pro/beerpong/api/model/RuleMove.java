package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
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
