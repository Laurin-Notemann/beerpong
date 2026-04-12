package pro.beerpong.api.model.dto.teammembers;

import lombok.Data;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDto;

import java.util.List;

@Data
public class TeamMemberCreateDto {
    private String playerId;
    private List<MatchMoveDto> moves;
}
