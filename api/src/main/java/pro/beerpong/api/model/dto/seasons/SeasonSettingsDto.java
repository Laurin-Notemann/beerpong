package pro.beerpong.api.model.dto.seasons;

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
    private String wakeTime = "00:00";
}
