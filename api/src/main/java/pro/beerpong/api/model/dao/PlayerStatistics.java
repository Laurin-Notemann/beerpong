package pro.beerpong.api.model.dao;

import com.google.common.collect.Maps;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pro.beerpong.api.util.EloAlgorithm;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Map;

@Entity(name = "statistics")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerStatistics {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private long points = 0;
    private long matches = 0;
    private long moves = 0;
    private long totalTeamSize = 0;
    private double avgPointsPerMatch = 0.0D;
    private double avgTeamSize = 0.0D;
    private double elo = EloAlgorithm.STARTING_ELO;
    @Transient
    private Map<RankingAlgorithm, Integer> rankBy = Maps.newHashMap();
}