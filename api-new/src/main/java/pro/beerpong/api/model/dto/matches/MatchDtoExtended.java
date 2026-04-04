package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import lombok.EqualsAndHashCode;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDtoComplete;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.model.dto.teams.TeamDto;

import java.time.ZonedDateTime;
import java.util.List;

@EqualsAndHashCode(callSuper = true)
@Data
public class MatchDtoExtended extends MatchDto {
    private List<TeamDto> teams;
    private List<TeamMemberDto> teamMembers;
    private List<MatchMoveDtoComplete> matchMoves;
}