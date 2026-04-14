package pro.beerpong.api.model.dto.seasons;

import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class SeasonDto {
    private String id;
    private String name;
    private ZonedDateTime startDate;
    private ZonedDateTime endDate;
    private String groupId;
    private SeasonSettingsDto seasonSettings;
    private String createdById;
}