package pro.beerpong.api.model.dto;

import java.time.ZonedDateTime;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private Season season;
}