package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.lang.Nullable;

@EqualsAndHashCode(callSuper = true)
@Data
public class ProfileCreatedDto extends ProfileDto {
    private boolean reactivated;
    @Nullable
    private String lastActiveSeasonId;

    public ProfileCreatedDto(ProfileDto profile, boolean reactivated, @Nullable String lastActiveSeasonId) {
        setId(profile.getId());
        setName(profile.getName());
        setAvatarAsset(profile.getAvatarAsset());
        setGroupId(profile.getGroupId());
        this.reactivated = reactivated;
        this.lastActiveSeasonId = lastActiveSeasonId;
    }
}
