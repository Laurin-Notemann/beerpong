package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.PlayerService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/players")
public class PlayerController {
    private final PlayerService playerService;

    @Autowired
    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<PlayerDto>>> getPlayers(@PathVariable String groupId,
                                                                        @PathVariable String seasonId,
                                                                        @RequestParam(required = false, defaultValue = "false") boolean showInactive) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (seasonId == null || seasonId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_ID);
        }

        var players = playerService.getBySeasonId(seasonId, showInactive);

        if (players != null) {
            return ResponseEnvelope.ok(players);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
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