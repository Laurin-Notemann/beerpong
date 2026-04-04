package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDtoComplete;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.model.dto.teams.TeamDto;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private String seasonId;
    private String createdBy;
}