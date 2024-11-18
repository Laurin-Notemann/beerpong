package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;
import pro.beerpong.api.service.RuleMoveService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rule-moves")
public class RuleMoveController {
    private final RuleMoveService moveService;

    @Autowired
    public RuleMoveController(RuleMoveService moveService) {
        this.moveService = moveService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> createRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody RuleMoveCreateDto dto) {
        var move = moveService.createRuleMove(groupId, seasonId, dto);

        if (move != null) {
            return ResponseEnvelope.ok(move);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @PutMapping("/{ruleMoveId}")
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> updateRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String ruleMoveId, @RequestBody RuleMoveCreateDto dto) {
        var move = moveService.updateRuleMove(groupId, ruleMoveId, dto);

        if (move != null) {
            return ResponseEnvelope.ok(move);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.RULE_MOVE_NOT_FOUND);
        }
    }

    @DeleteMapping("/{ruleMoveId}")
    public ResponseEntity<ResponseEnvelope<String>> deleteRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String ruleMoveId) {
        if (moveService.deleteById(groupId, ruleMoveId)) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.RULE_MOVE_NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleMoveDto>>> getAllRuleMoves(@PathVariable String groupId, @PathVariable String seasonId) {
        return ResponseEnvelope.ok(moveService.getAllMoves(seasonId));
    }
}