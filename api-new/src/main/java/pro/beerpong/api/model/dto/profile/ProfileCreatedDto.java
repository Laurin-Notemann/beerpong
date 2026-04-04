package pro.beerpong.api.model.dto.profile;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.groupmembers.GroupMemberDto;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
public class ProfileCreatedDto extends ProfileDto {
    private boolean reactivated;
    @Nullable
    private String lastActiveSeasonId;

    public ProfileCreatedDto(String id, String name, String asset, String groupId, String createdBy, boolean reactivated, @Nullable String lastActiveSeasonId) {
        setId(id);
        setName(name);
        setAssetIdAvatar(asset);
        setGroupId(groupId);
        setCreatedBy(createdBy);
        this.reactivated = reactivated;
        this.lastActiveSeasonId = lastActiveSeasonId;
    }

    public ProfileCreatedDto(ProfileDto profile, boolean reactivated, @Nullable String lastActiveSeasonId) {
        this(profile.getId(), profile.getName(), profile.getAssetIdAvatar(), profile.getGroupId(), profile.getCreatedBy(), reactivated, lastActiveSeasonId);
    }
}
