package pro.beerpong.api.model.dto.seasons;

import lombok.Data;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.groupmembers.GroupMemberDto;

import java.time.ZonedDateTime;

@Data
public class SeasonDto {
    private String id;
    private String name;
    private ZonedDateTime startDate;
    private ZonedDateTime endDate;
    private String groupId;
    private SeasonSettings seasonSettings;
    private GroupMemberDto createdBy;
}