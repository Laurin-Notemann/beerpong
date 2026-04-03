package pro.beerpong.api.model.dao;

import com.google.common.collect.Maps;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "statistics")
public class PlayerStatistics {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private long points = 0;

    private long matches = 0;

    @Column(columnDefinition = "bigint default 0")
    private long wins = 0;

    private long moves = 0;

    private long totalTeamSize = 0;

    private double avgPointsPerMatch = 0.0D;

    private double avgTeamSize = 0.0D;

    private double elo = /* TODO EloAlgorithm.STARTING_ELO*/ 1000;

    @Transient
    private Map<RankingAlgorithm, Integer> rankBy = Maps.newHashMap();
}
