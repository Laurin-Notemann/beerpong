package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

@Data
public class SeasonSettingsDto {
    private Integer minMatchesToQualify;
    private Integer minTeamSize;
    private Integer maxTeamSize;
    private RankingAlgorithm rankingAlgorithm;
    private DailyLeaderboard dailyLeaderboard;
    //TODO adjust for new wakeTime
    private Integer wakeTimeHour;
}
