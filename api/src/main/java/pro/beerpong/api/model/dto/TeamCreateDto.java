package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class TeamCreateDto {
    private List<TeamMemberCreateDto> teamMembers;
}
