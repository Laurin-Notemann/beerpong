package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "profileId")
    private Profile profile;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;
}
