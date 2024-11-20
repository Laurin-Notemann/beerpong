package pro.beerpong.api.model.dto;

import com.google.common.collect.Maps;
import lombok.Data;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Map;

@Data
public class LeaderboardEntryDto {
    private String playerId;
    private int totalPoints = 0;
    private int totalGames = 0;
    private int totalMoves = 0;
    private int totalTeamSize = 0;
    private double averagePointsPerMatch = 0.0D;
    private double averageTeamSize = 0.0D;
    private double elo = 100D;
    private Map<RankingAlgorithm, Integer> rankBy = Maps.newHashMap();

    public void addTotalPoints(int amount) {
        this.totalPoints += amount;
    }

    public void addTotalGames() {
        this.totalGames++;
    }

    public void addTotalMoves(int amount) {
        this.totalMoves += amount;
    }

    public void addTotalTeamSize(int amount) {
        this.totalTeamSize += amount;
    }

    public void calculate() {
        this.averagePointsPerMatch = (double) totalPoints / (double) totalGames;
        this.averageTeamSize = (double) totalTeamSize / (double) totalGames;
    }
}
