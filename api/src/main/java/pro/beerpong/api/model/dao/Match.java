package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity(name = "matches")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Data
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    private String id;

    private ZonedDateTime date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id")
    private Season season;

    @OneToMany(mappedBy = "match", fetch = FetchType.LAZY)
    @ToString.Exclude
    private Set<Team> teams = new HashSet<>();
}
