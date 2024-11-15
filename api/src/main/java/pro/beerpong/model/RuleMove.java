package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

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
