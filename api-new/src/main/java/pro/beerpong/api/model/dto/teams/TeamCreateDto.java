package pro.beerpong.api.model.dto.teams;

import lombok.Data;
import org.springframework.lang.Nullable;
import pro.beerpong.api.model.dto.teammembers.TeamMemberCreateDto;

import java.util.List;

@Data
public class TeamCreateDto {
    @Nullable
    private String existingTeamId;
    private boolean savePhoto;
    private List<TeamMemberCreateDto> teamMembers;
}
