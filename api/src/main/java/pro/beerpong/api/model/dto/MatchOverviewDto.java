package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class MatchOverviewDto {
    private String id;
    private ZonedDateTime date;
    private Season season;

    private MatchOverviewTeamDto blueTeam;
    private MatchOverviewTeamDto redTeam;
}