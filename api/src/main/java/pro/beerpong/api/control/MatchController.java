package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.MatchService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/matches")
@RequiredArgsConstructor
public class MatchController {
    private final MatchService matchService;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<MatchDto>> createMatch(@PathVariable String groupId, @PathVariable String seasonId,
                                                                  @RequestBody MatchCreateDto matchCreateDt) {
        var match = matchService.createNewMatch(groupId, seasonId, matchCreateDt);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_VALIDATION_FAILED);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<MatchDto>>> getAllMatches(@PathVariable String groupId, @PathVariable String seasonId) {
        return ResponseEnvelope.ok(matchService.getAllMatches(seasonId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> getMatchById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var match = matchService.getMatchById(id);

        if (match != null && match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
            return ResponseEnvelope.ok(match);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> updateMatch(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id,
                                                                  @RequestBody MatchCreateDto matchCreateDto) {
        var match = matchService.updateMatch(groupId, id, matchCreateDto);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_VALIDATION_FAILED);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }
    }
}