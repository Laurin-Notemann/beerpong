package pro.beerpong.api.model.dto;

import lombok.Data;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private SeasonDto season;
    private GroupMemberDto createdBy;
    private List<TeamDto> teams;
    private List<TeamMemberDto> teamMembers;
    private List<MatchMoveDtoComplete> matchMoves;
}