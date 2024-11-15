package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "teamId")
    private Team team;

    @ManyToOne
    @JoinColumn(name = "playerId")
    private Player player;
}
