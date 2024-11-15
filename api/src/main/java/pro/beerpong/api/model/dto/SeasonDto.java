package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Group;

import java.time.ZonedDateTime;

@Data
public class SeasonDto {
    private String id;
    private String name;
    private ZonedDateTime startDate;
    private ZonedDateTime endDate;
    private GroupDto group;
}
