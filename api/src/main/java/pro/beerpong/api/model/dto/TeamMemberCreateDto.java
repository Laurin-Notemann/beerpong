package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class TeamMemberCreateDto {
    private String playerId;
    private List<MatchMoveDto> moves;
}
