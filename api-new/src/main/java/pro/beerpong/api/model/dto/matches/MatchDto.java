package pro.beerpong.api.model.dto.matches;

import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private String seasonId;
    private String createdById;
}