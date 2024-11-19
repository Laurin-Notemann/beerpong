package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity(name = "teams")
@Data
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "match_id")
    private Match match;

    @OneToMany(mappedBy = "team")
    private List<TeamMember> teamMembers;
}
