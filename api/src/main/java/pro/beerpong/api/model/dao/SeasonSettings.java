package pro.beerpong.api.model.dao;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
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
}
