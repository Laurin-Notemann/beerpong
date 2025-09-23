package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.SeasonSettings;

import java.time.ZonedDateTime;

@Data
public class SeasonDto {
    @NotNull
    private String id;
    private String name;
    @NotNull
    private ZonedDateTime startDate;
    private ZonedDateTime endDate;
    @NotNull
    private String groupId;
    @NotNull
    private SeasonSettings seasonSettings;
}