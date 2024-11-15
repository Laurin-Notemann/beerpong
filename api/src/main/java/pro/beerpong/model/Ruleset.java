package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Ruleset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;
}
