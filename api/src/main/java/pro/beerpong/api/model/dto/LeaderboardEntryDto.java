package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.List;
import java.util.Map;

@Data
public class LeaderboardEntryDto {
    private String playerId;
    private int totalPoints;
    private double averagePointsPerMatch;
    private double normalizedPointsPerMatch;
    private double elo;
    private Map<RankingAlgorithm, Integer> rankBy;
}
