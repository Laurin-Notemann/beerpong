package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.PlayerStatistics;

@Data
public class PlayerDto {
    private String id;
    private ProfileDto profile;
    private SeasonDto season;
    private boolean activeThisSeason;
    private PlayerStatistics statistics;
}