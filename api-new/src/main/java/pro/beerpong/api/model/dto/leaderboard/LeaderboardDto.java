package pro.beerpong.api.model.dto.leaderboard;

import lombok.Data;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.player.PlayerDtoExtended;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class LeaderboardDto {
    private long numPlayers;
    private long numMatches;
    private ZonedDateTime startedAt;
    private List<PlayerDtoExtended> entries;
}
