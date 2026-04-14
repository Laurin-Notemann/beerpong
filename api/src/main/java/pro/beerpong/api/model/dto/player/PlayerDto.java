package pro.beerpong.api.model.dto.player;

import lombok.Data;

@Data
public class PlayerDto {
    private String id;
    private String profileId;
    private String seasonId;
    private boolean activeThisSeason;
    private String statisticsId;
}