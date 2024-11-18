package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
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
public class MatchController {
    private final MatchService matchService;

    @Autowired
    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<MatchDto>> createMatch(@PathVariable String groupId, @PathVariable String seasonId,
                                                                  @RequestBody MatchCreateDto matchCreateDt) {
        var pair = matchService.getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (pair.getSecond().getEndDate() != null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_ALREADY_ENDED);
        }

        var match = matchService.createNewMatch(pair.getFirst(), pair.getSecond(), matchCreateDt);

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