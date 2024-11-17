package pro.beerpong.api.model.dto;

import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class AssetMetadataDto {
    private String id;
    private String mediaType;
    private ZonedDateTime uploadedAt;
}