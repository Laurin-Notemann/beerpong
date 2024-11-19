package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class MatchOverviewTeamDto {
    // total amount of points that this team made in this game
    //TODO should pointsForTeam count only once here?
    private int points;

    private List<MatchOverviewTeamMemberDto> members;
}
