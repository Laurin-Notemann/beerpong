package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class ProfileDto {
    private String id;
    private String name;
    private String profilePicture;
    private String groupId;
}
