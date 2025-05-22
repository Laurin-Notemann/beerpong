package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;
import pro.beerpong.api.service.RuleMoveService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rule-moves")
public class RuleMoveController {
    private final RuleMoveService moveService;
    private final SeasonService seasonService;

    @Autowired
    public RuleMoveController(RuleMoveService moveService, SeasonService seasonService) {
        this.moveService = moveService;
        this.seasonService = seasonService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> createRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody RuleMoveCreateDto dto) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateActiveSeason(RuleMoveDto.class, pair);

        if (error != null) {
            return error;
        }

        var move = moveService.createRuleMove(pair.getFirst(), pair.getSecond(), dto);

        if (move != null) {
            return ResponseEnvelope.ok(move);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @PutMapping("/{ruleMoveId}")
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> updateRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String ruleMoveId, @RequestBody RuleMoveCreateDto dto) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateActiveSeason(RuleMoveDto.class, pair);

        if (error != null) {
            return error;
        }

        var move = moveService.getById(ruleMoveId);

        if (move == null) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_NOT_FOUND);
        }

        if (!moveService.validateGroupAndSeason(groupId, seasonId, move)) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_VALIDATION_FAILED);
        }

        return ResponseEnvelope.ok(moveService.updateRuleMove(groupId, move, dto));
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleMoveDto>>> getAllRuleMoves(@PathVariable String groupId, @PathVariable String seasonId) {
        return ResponseEnvelope.ok(moveService.getAllMoves(seasonId));
    }
}