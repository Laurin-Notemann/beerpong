package pro.beerpong.api.model.dto.matches;

import lombok.Data;

import java.time.ZonedDateTime;

@Data
public class MatchOverviewDto {
    private String id;
    private ZonedDateTime date;
    private String seasonId;

    private MatchOverviewTeamDto blueTeam;
    private MatchOverviewTeamDto redTeam;
}