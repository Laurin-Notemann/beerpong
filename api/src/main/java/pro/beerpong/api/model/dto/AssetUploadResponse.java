package pro.beerpong.api.model.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class AssetUploadResponse extends AssetMetadataDto {
    private String singleUploadUrl;
}
