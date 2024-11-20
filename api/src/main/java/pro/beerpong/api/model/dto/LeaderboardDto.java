package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class LeaderboardDto {
    private List<LeaderboardEntryDto> entries;
}
