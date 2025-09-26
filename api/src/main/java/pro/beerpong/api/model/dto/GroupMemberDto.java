package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class GroupMemberDto {
    private String id;
    private boolean active;
    private String groupId;
    private String userId;
}
