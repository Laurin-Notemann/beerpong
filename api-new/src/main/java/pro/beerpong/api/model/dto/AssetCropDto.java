package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class AssetCropDto {
    private double offsetX;
    private double offsetY;
    private double zoom;

    public boolean validate() {
        return this.offsetX >= 0 && this.offsetY >= 0 && this.zoom >= 0;
    }
}