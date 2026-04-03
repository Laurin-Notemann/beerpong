package pro.beerpong.api.model.dto.rules;

import lombok.Data;
import pro.beerpong.api.model.dto.groupmembers.GroupMemberDto;

@Data
public class RuleDto {
    private String id;
    private String title;
    private String description;
    private GroupMemberDto createdBy;
}