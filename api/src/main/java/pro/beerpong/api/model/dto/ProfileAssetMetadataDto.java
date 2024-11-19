package pro.beerpong.api.model.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.ZonedDateTime;

@Data
public class ProfileAssetMetadataDto {
    private String profileId;
    private String id;
    private String url;
    private String mediaType;
    private ZonedDateTime uploadedAt;

    public ProfileAssetMetadataDto(AssetMetadataDto  dto, String profileId) {
        this.profileId = profileId;
        this.id = dto.getId();
        this.url = dto.getUrl();
        this.mediaType = dto.getMediaType();
        this.uploadedAt = dto.getUploadedAt();
    }
}