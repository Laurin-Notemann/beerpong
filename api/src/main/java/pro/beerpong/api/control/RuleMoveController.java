package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.RuleMoveService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rule-moves")
public class RuleMoveController {
    private final RuleMoveService moveService;
    private final SeasonService seasonService;
    private final RuleMoveRepository ruleMoveRepository;
    private final SeasonRepository seasonRepository;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> createRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody RuleMoveCreateDto dto) {
        var response = seasonService.validateActiveSeason(groupId, seasonId);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        var pair = response.getData();

        if (dto.invalidDto()) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_INVALID_DTO);
        }

        var move = moveService.createRuleMove(groupId, pair.getSecond(), dto, true);

        if (move.isOk()) {
            return ResponseEnvelope.ok(move.getData());
        } else {
            return ResponseEnvelope.notOk(move.getErrorCode());
        }
    }

    @PutMapping("/{ruleMoveId}")
    public ResponseEntity<ResponseEnvelope<RuleMoveDto>> updateRuleMove(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String ruleMoveId, @RequestBody RuleMoveCreateDto dto) {
        var response = seasonService.validateActiveSeason(groupId, seasonId);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        var pair = response.getData();

        if (dto.invalidDto()) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_INVALID_DTO);
        }

        var move = moveService.getById(ruleMoveId);

        if (move == null) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_NOT_FOUND);
        }

        if (!ruleMoveRepository.existsByIdAndSeasonId(ruleMoveId, pair.getSecond().getId())) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_MOVE_VALIDATION_FAILED);
        }

        var res = moveService.updateRuleMove(groupId, ruleMoveId, dto);

        if (res.isOk()) {
            return ResponseEnvelope.ok(res.getData());
        } else {
            return ResponseEnvelope.notOk(res.getErrorCode());
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleMoveDto>>> getAllRuleMoves(@PathVariable String groupId, @PathVariable String seasonId) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(moveService.getAllMoves(seasonId));
    }
}