package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import pro.beerpong.api.model.dto.teams.TeamCreateDto;

import java.util.List;

@Data
public class MatchCreateDto {
    private List<TeamCreateDto> teams;
}
