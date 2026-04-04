package pro.beerpong.api.model.dto.groups;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
    private String activeSeasonId;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String assetIdWallpaper;
    private String createdBy;
    private ZonedDateTime createdAt;
    private GroupPreset sportPreset;
    private String customSportName;
    private int numberOfPlayers;
    private int numberOfMatches;
    private int numberOfSeasons;
}
