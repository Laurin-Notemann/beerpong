package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;
import java.util.Set;

@Entity(name = "teams")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Data
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    private Match match;

    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    private Set<TeamMember> teamMembers;
}
