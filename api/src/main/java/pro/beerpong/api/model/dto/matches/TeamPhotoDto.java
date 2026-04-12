package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import org.jetbrains.annotations.Nullable;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;

@Data
public class TeamPhotoDto {
    private @Nullable String teamId;
    private AssetUploadResponse teamPhoto;
}
