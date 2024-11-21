package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "match_moves")
@Data
public class MatchMove {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int value;

    @ManyToOne
    @JoinColumn(name = "team_member_id")
    private TeamMember teamMember;

    @ManyToOne
    @JoinColumn(name = "move_id")
    private RuleMove move;
}
