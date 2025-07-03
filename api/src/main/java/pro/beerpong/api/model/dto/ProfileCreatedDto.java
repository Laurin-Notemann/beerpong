package pro.beerpong.api.model.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;

@EqualsAndHashCode(callSuper = true)
@Data
@NoArgsConstructor
public class ProfileCreatedDto extends ProfileDto {
    private boolean reactivated;
    @Nullable
    private String lastActiveSeasonId;

    public ProfileCreatedDto(String id, String name, AssetMetadataDto asset, String groupId, GroupMemberDto createdBy, boolean reactivated, @Nullable String lastActiveSeasonId) {
        setId(id);
        setName(name);
        setAvatarAsset(asset);
        setGroupId(groupId);
        setCreatedBy(createdBy);
        this.reactivated = reactivated;
        this.lastActiveSeasonId = lastActiveSeasonId;
    }

    public ProfileCreatedDto(ProfileDto profile, boolean reactivated, @Nullable String lastActiveSeasonId) {
        this(profile.getId(), profile.getName(), profile.getAvatarAsset(), profile.getGroupId(), profile.getCreatedBy(), reactivated, lastActiveSeasonId);
    }
}
