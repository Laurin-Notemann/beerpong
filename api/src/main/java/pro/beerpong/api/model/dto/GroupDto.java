package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
}
