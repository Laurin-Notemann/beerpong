package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDto;

import java.util.List;

@Data
public class MatchOverviewTeamMemberDto {
    private String playerId;
    // the amount of points this member made in this game
    private int points;
    private List<MatchMoveDto> moves;
}
