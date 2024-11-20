package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.MatchService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/matches")
public class MatchController {
    private final MatchService matchService;
    private final SeasonService seasonService;

    @Autowired
    public MatchController(MatchService matchService, SeasonService seasonService) {
        this.matchService = matchService;
        this.seasonService = seasonService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<MatchDto>> createMatch(@PathVariable String groupId, @PathVariable String seasonId,
                                                                  @RequestBody MatchCreateDto matchCreateDto) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateActiveSeason(MatchDto.class, pair);

        if (error != null || pair.getFirst() == null || pair.getSecond() == null) {
            return error;
        }

        if (!matchService.validateCreateDto(pair.getSecond(), matchCreateDto)) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.MATCH_CREATE_DTO_VALIDATION_FAILED);
        }

        var match = matchService.createNewMatch(pair.getFirst(), pair.getSecond(), matchCreateDto);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<MatchDto>>> getAllMatches(@PathVariable String groupId, @PathVariable String seasonId) {
        var season = seasonService.getSeasonById(seasonId);

        if (season == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!season.getId().equals(seasonId) || !season.getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.getAllMatches(seasonId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> getMatchById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var match = matchService.getMatchById(id);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @GetMapping("/overview")
    public ResponseEntity<ResponseEnvelope<List<MatchOverviewDto>>> getAllMatchOverviews(@PathVariable String groupId, @PathVariable String seasonId) {
        var season = seasonService.getSeasonById(seasonId);

        if (season == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!season.getId().equals(seasonId) || !season.getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.getAllMatchOverviews(seasonId));
    }

    @GetMapping("/{id}/overview")
    public ResponseEntity<ResponseEnvelope<MatchOverviewDto>> getMatchOverviewById(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id) {
        var match = matchService.getMatchOverviewById(id);

        if (match != null) {
            if (match.getSeason().getId().equals(seasonId) && match.getSeason().getGroupId().equals(groupId)) {
                return ResponseEnvelope.ok(match);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.MATCH_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<MatchDto>> updateMatch(@PathVariable String groupId, @PathVariable String seasonId, @PathVariable String id,
                                                                  @RequestBody MatchCreateDto matchCreateDto) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateActiveSeason(MatchDto.class, pair);

        if (error != null || pair.getFirst() == null || pair.getSecond() == null) {
            return error;
        }

        if (!matchService.validateCreateDto(pair.getSecond(), matchCreateDto)) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.MATCH_CREATE_DTO_VALIDATION_FAILED);
        }

        var match = matchService.getRawMatchById(id);

        if (match == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.MATCH_NOT_FOUND);
        } else if (!match.getSeason().getId().equals(seasonId) || !match.getSeason().getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(matchService.updateMatch(pair.getFirst(), match, matchCreateDto));
    }
}