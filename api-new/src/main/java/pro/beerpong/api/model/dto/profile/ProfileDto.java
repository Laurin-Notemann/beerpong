package pro.beerpong.api.model.dto.profile;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.groupmembers.GroupMemberDto;

@Data
public class ProfileDto {
    private String id;
    private String name;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String assetIdAvatar;
    private String groupId;
    private String createdBy;
}
