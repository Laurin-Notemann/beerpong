package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Data
public class Rule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String ruleDescription;

    @ManyToOne
    @JoinColumn(name = "rulesetId")
    private Ruleset ruleset;
}
