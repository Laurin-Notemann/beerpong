package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.util.AssetType;

import java.time.ZonedDateTime;

@Data
public class AssetCropDto {
    private double offsetX;
    private double offsetY;
    private double zoom;
    private double width;
    private double height;
    private double originX;

    public boolean validate() {
        return this.offsetX >= 0 && this.offsetY >= 0 && this.zoom >= 0;
    }
}