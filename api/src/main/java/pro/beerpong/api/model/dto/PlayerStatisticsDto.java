package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class PlayerStatisticsDto {
    private long points;
    private long matches;
}