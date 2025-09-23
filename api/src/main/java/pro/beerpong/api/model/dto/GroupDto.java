package pro.beerpong.api.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import pro.beerpong.api.model.dao.Season;

import java.time.ZonedDateTime;

@Data
public class GroupDto {
    @NotNull
    private String id;
    @NotNull
    private String name;
    @NotNull
    private String inviteCode;
    private Season activeSeason;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private AssetMetadataDto wallpaperAsset;
    @NotNull
    private ZonedDateTime createdAt;
    @NotNull
    private GroupPreset sportPreset;
    @NotNull
    private String customSportName;
    @NotNull
    private int numberOfPlayers;
    @NotNull
    private int numberOfMatches;
    @NotNull
    private int numberOfSeasons;
}
