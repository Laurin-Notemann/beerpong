package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity(name = "players")
@Data
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "profile_id")
    private Profile profile;

    @ManyToOne
    @JoinColumn(name = "season_id")
    private Season season;

    @OneToOne
    @JoinColumn(name = "statistics_id")
    private PlayerStatistics statistics;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean activeThisSeason;

    @OneToMany(mappedBy = "player")
    private List<TeamMember> teamMembers;
}
