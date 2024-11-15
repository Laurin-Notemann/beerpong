package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "players")
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
