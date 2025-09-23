package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class MatchDto {
    @NotNull
    private String id;
    @NotNull
    private ZonedDateTime date;
    @NotNull
    private Season season;
    @NotNull
    private List<TeamDto> teams;
    @NotNull
    private List<TeamMemberDto> teamMembers;
    @NotNull
    private List<MatchMoveDtoComplete> matchMoves;
}