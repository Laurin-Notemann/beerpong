package pro.beerpong.api.model.dto.player;

import lombok.Data;
import pro.beerpong.api.model.dto.seasons.SeasonDto;

@Data
public class PlayerDtoExtended {
    private String id;
    private String profileId;
    private SeasonDto season;
    private boolean activeThisSeason;
    private PlayerStatisticsDto statistics;
}