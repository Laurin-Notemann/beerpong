package pro.beerpong.api.control;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.model.dto.SeasonCreateDto;
import pro.beerpong.api.model.dto.SeasonDto;
import pro.beerpong.api.service.MatchService;
import pro.beerpong.api.service.SeasonService;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}")
public class MatchController {
    private final MatchService matchService;

    @Autowired
    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PutMapping("/new-match")
    public ResponseEntity<ResponseEnvelope<MatchDto>> createMatch(@PathVariable String groupId, @PathVariable String seasonId) {
        var match = matchService.createNewMatch(seasonId);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_VALIDATION_FAILED);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @GetMapping("/matches")
    public ResponseEntity<ResponseEnvelope<List<MatchDto>>> getAllMatches(@PathVariable String groupId, @PathVariable String seasonId) {
        return ResponseEnvelope.ok(matchService.getAllMatches(seasonId));
    }

    @GetMapping("/matches/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> getMatchById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var match = matchService.getMatchById(id);

        if (match != null && match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
            return ResponseEnvelope.ok(match);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.MATCH_NOT_FOUND);
        }
    }
}