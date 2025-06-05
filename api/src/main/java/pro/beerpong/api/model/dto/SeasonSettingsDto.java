package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

@Data
public class SeasonSettingsDto {
    private int minMatchesToQualify = 1;
    private int minTeamSize = 1;
    private int maxTeamSize = 10;
    private RankingAlgorithm rankingAlgorithm = RankingAlgorithm.AVERAGE;
    private DailyLeaderboard dailyLeaderboard = DailyLeaderboard.WAKE_TIME;
    private String wakeTime = "00:00";
}
