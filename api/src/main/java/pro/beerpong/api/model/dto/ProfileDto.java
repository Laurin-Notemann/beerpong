package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class ProfileDto {
    private String id;
    private String name;
    //private String profilePicture; TODO store asset
    private String groupId;
}
