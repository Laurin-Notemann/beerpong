package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.AssetType;

import java.time.ZonedDateTime;

@Data
public class AssetMetadataDto {
    @NotNull
    private String id;
    @NotNull
    private String url;
    @NotNull
    private AssetType type;
    private double offsetX;
    @NotNull
    private double offsetY;
    @NotNull
    private double zoom;
}