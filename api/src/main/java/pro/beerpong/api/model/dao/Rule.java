package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "rules")
@Data
public class Rule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String ruleDescription;

    @ManyToOne
    @JoinColumn(name = "rulesetId")
    private Ruleset ruleset;
}
