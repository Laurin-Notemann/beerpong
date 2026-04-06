package pro.beerpong.api.model.dto.groups;

import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
    private String activeSeasonId;
    private String assetIdWallpaper;
    private String createdById;
    private ZonedDateTime createdAt;
    private GroupPreset sportPreset;
    private String customSportName;
    private long numberOfPlayers;
    private long numberOfMatches;
    private long numberOfSeasons;
}
