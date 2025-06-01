package pro.beerpong.api.model.dto;

import lombok.Data;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class LeaderboardDto {
    private long numPlayers;
    private long numMatches;
    private ZonedDateTime startedAt;
    private List<PlayerDto> entries;
}
