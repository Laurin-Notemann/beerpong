package pro.beerpong.api.model.dto;

import lombok.Data;
import lombok.experimental.Accessors;
import org.springframework.lang.Nullable;

import java.util.List;

@Data
public class TeamCreateDto {
    @Nullable
    private String existingTeamId;
    private boolean savePhoto;
    private List<TeamMemberCreateDto> teamMembers;
}
