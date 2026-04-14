package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "season_settings")
public class SeasonSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private int minMatchesToQualify;

    private int minTeamSize;

    private int maxTeamSize;

    private RankingAlgorithm rankingAlgorithm;

    private DailyLeaderboard dailyLeaderboard;

    @Column(columnDefinition = "time default '00:00:00'")
    private LocalTime wakeTime;

    public static SeasonSettings createDefault() {
        return new SeasonSettings(
                null,
                1,
                1,
                10,
                RankingAlgorithm.AVERAGE,
                DailyLeaderboard.WAKE_TIME,
                LocalTime.of(0, 0)
        );
    }
}
