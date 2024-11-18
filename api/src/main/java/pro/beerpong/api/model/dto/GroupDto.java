package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import pro.beerpong.api.model.dao.GroupSettings;
import pro.beerpong.api.model.dao.Season;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
    private GroupSettings groupSettings;
    private Season activeSeason;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto wallpaperAsset;
    private int numberOfPlayers;
    private int numberOfMatches;
    private int numberOfSeasons;
}
