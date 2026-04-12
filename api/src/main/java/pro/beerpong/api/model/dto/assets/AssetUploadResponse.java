package pro.beerpong.api.model.dto.assets;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class AssetUploadResponse extends AssetMetadataDto {
    private String singleUploadUrl;
}
