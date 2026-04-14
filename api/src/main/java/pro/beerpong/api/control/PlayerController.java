package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.player.PlayerDtoExtended;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.PlayerService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/players")
public class PlayerController {
    private final SeasonRepository seasonRepository;

    private final PlayerService playerService;
    private final SeasonService seasonService;
    private final PlayerRepository playerRepository;

    @GetMapping("/extended")
    public ResponseEntity<ResponseEnvelope<List<PlayerDtoExtended>>> getPlayersExtended(@PathVariable String groupId,
                                                                                        @PathVariable String seasonId,
                                                                                        @RequestParam(required = false, defaultValue = "false") boolean showInactive) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var players = seasonService.getPlayersWithStats(groupId, seasonId, showInactive);

        if (players != null) {
            return ResponseEnvelope.ok(players);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.ERROR);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<PlayerDto>>> getPlayers(@PathVariable String groupId,
                                                                        @PathVariable String seasonId,
                                                                        @RequestParam(required = false, defaultValue = "false") boolean showInactive) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var players = seasonService.getPlayers(seasonId, showInactive);

        if (players != null) {
            return ResponseEnvelope.ok(players);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<String>> deletePlayer(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var error = playerService.deletePlayer(id, groupId);

        if (error.isOk()) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(error.getErrorCode());
        }
    }
}