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

    @ManyToOne(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "match_id")
    private Match match;

    @OneToMany(mappedBy = "team", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private List<TeamMember> teamMembers;
}
