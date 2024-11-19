package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class MatchOverviewTeamMemberDto {
    private String playerId;
    // the amount of points this member made in this game
    private int points;
    private List<MatchMoveDto> moves;
}
