package pro.beerpong.api.model.dao;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

@Entity(name = "season_settings")
@Data
public class SeasonSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int minMatchesToQualify;
    private int minTeamSize;
    private int maxTeamSize;
    private RankingAlgorithm rankingAlgorithm;
    private DailyLeaderboard dailyLeaderboard;
    private int wakeTimeHour;

    public static SeasonSettings createDefault() {
        var seasonSettings = new SeasonSettings();

        seasonSettings.setMinMatchesToQualify(1);
        seasonSettings.setMinTeamSize(1);
        seasonSettings.setMaxTeamSize(10);
        seasonSettings.setRankingAlgorithm(RankingAlgorithm.AVERAGE);
        seasonSettings.setDailyLeaderboard(DailyLeaderboard.WAKE_TIME);
        seasonSettings.setWakeTimeHour(0);

        return seasonSettings;
    }
}
