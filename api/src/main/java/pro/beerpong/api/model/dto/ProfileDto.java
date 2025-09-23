package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
public class ProfileDto {
    @NotNull
    private String id;
    @NotNull
    private String name;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto avatarAsset;
    @NotNull
    private String groupId;
}
