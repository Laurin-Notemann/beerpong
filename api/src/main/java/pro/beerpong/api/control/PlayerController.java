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
    public ResponseEntity<ResponseEnvelope<List<PlayerDto>>> getPlayers(@PathVariable String groupId, @PathVariable String seasonId) {
        var players = playerService.getBySeasonId(seasonId);

        if (players != null) {
            return ResponseEnvelope.ok(players);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<String>> deletePlayer(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var error = playerService.deletePlayer(id, seasonId, groupId);

        if (error == null) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, error);
        }
    }
}