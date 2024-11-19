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

    private List<MatchMoveDtoComplete> blueMoves;
    private List<MatchMoveDtoComplete> redMoves;

    private TeamDto blueTeam;
    private TeamDto redTeam;

    private List<TeamMemberDto> blueTeamMembers;
    private List<TeamMemberDto> redTeamMembers;
}