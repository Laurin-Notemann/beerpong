package pro.beerpong.api.model.dto;

import com.google.common.collect.Maps;
import jakarta.persistence.Transient;
import lombok.Data;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Map;

@Data
public class PlayerStatisticsDto {
    private String id;
    private long points = 0;
    private long matches = 0;
    private long moves = 0;
    private long totalTeamSize = 0;
    private double avgPointsPerMatch = 0.0D;
    private double avgTeamSize = 0.0D;
    private double elo = 100D;
    @Transient
    private Map<RankingAlgorithm, Integer> rankBy = Maps.newHashMap();

    public void addPoints(int amount) {
        this.points += amount;
    }

    public void addMatch() {
        this.matches++;
    }

    public void addMoves(int amount) {
        this.moves += amount;
    }

    public void addTotalTeamSize(int amount) {
        this.totalTeamSize += amount;
    }

    public void calculate() {
        this.avgPointsPerMatch = matches > 0 ? (double) points / (double) matches : 0;
        this.avgTeamSize = matches > 0 ? (double) totalTeamSize / (double) matches : 0;
    }
}
