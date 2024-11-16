package pro.beerpong.api.model.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class MatchCreateDto {
    private List<TeamCreateDto> teams;
}
