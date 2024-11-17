package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class PlayerDto {
    private String id;
    private ProfileDto profile;
    private SeasonDto season;
    private PlayerStatisticsDto statistics;
}
