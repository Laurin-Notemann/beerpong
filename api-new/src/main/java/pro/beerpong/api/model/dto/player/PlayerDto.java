package pro.beerpong.api.model.dto.player;

import lombok.Data;
import pro.beerpong.api.model.dto.profile.ProfileDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;

@Data
public class PlayerDto {
    private String id;
    private String profileId;
    private String seasonId;
    private boolean activeThisSeason;
    private String statisticsId;
}