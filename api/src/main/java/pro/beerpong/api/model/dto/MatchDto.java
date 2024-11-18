package pro.beerpong.api.model.dto;

import java.time.ZonedDateTime;
import java.util.List;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private Season season;
    private List<TeamDto> teams;
    private List<TeamMemberDto> teamMembers;
    private List<MatchMoveDtoComplete> matchMoves;
}