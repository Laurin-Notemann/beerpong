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
    @JoinColumn(name = "teamMemberId")
    private TeamMember teamMember;

    @ManyToOne
    @JoinColumn(name = "moveId")
    private RuleMove move;
}
