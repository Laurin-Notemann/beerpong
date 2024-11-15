package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class ProfileCreateDto {
    private String name;
    private String profilePicture;
    private String groupId;
}
