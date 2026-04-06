package pro.beerpong.api.model.dto.profile;

import lombok.Data;

@Data
public class ProfileDto {
    private String id;
    private String name;
    private String assetIdAvatar;
    private String groupId;
    private String createdById;
}
