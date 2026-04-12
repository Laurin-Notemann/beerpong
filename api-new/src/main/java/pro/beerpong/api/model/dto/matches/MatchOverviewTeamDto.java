package pro.beerpong.api.model.dto.matches;

import lombok.Data;

import java.util.List;

@Data
public class MatchOverviewTeamDto {
    // total amount of points that this team made in this game
    private int points;
    private String teamId;
    private String assetPhotoId;

    private List<MatchOverviewTeamMemberDto> members;
}
