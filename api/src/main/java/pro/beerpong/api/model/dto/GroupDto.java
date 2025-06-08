package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import pro.beerpong.api.model.dao.Season;

import java.time.ZonedDateTime;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
    private SeasonDto activeSeason;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto wallpaperAsset;
    private GroupMemberDto createdBy;
    private ZonedDateTime createdAt;
    private GroupPreset sportPreset;
    private String customSportName;
    private int numberOfPlayers;
    private int numberOfMatches;
    private int numberOfSeasons;
}
