package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "teams")
@Data
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "matchId")
    private Match match;
}
