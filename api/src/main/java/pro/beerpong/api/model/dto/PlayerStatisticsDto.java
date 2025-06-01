package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class PlayerStatisticsDto {
    private String id;
    private long points;
    private long matches;
}