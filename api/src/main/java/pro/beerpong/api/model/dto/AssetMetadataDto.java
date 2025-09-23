package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.AssetType;

import java.time.ZonedDateTime;

@Data
public class AssetMetadataDto {
    private String id;
    private String url;
    private AssetType type;
    private double offsetX;
    private double offsetY;
    private double zoom;
}