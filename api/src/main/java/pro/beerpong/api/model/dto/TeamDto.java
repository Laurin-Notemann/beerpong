package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
public class TeamDto {
    @NotNull
    private String id;
    @NotNull
    private String matchId;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto photoAsset;
}
