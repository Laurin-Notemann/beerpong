package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity(name = "team_members")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Data
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    private Player player;

    @OneToMany(mappedBy = "teamMember", fetch = FetchType.LAZY)
    @ToString.Exclude
    private Set<MatchMove> matchMoves = new HashSet<>();
}
