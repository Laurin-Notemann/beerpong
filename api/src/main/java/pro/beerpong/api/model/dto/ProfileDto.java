package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
public class ProfileDto {
    private String id;
    private String name;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto avatarAsset;
    private String groupId;
}
