package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
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
