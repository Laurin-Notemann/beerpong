package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.PlayerService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/players")
public class PlayerController {
    private final PlayerService playerService;
    private final SeasonService seasonService;

    @Autowired
    public PlayerController(PlayerService playerService, SeasonService seasonService) {
        this.playerService = playerService;
        this.seasonService = seasonService;
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<PlayerDto>>> getPlayers(@PathVariable String groupId,
                                                                        @PathVariable String seasonId,
                                                                        @RequestParam(required = false, defaultValue = "false") boolean showInactive,
                                                                        @RequestParam(required = false, defaultValue = "false") boolean showStats) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (seasonId == null || seasonId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_ID);
        }

        var season = seasonService.getSeasonById(seasonId);

        if (season == null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }

        if (!season.getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var players = seasonService.calcStatsForPlayersInSeason(season, showInactive, showStats);

        if (players != null) {
            return ResponseEnvelope.ok(players);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<String>> deletePlayer(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (seasonId == null || seasonId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_ID);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_PLAYER_ID);
        }

        var error = playerService.deletePlayer(id, seasonId, groupId);

        if (error == null) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(error);
        }
    }
}