package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
<<<<<<< HEAD
=======
import java.util.UUID;
>>>>>>> 9b6c396 (Basic entity creation)

@Entity
@Data
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
<<<<<<< HEAD
    private String id;
=======
    private UUID id;
>>>>>>> 9b6c396 (Basic entity creation)

    @ManyToOne
    @JoinColumn(name = "teamId")
    private Team team;

    @ManyToOne
    @JoinColumn(name = "playerId")
    private Player player;
}
