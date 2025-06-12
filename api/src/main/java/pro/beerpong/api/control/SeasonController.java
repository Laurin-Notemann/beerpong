package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}")
public class SeasonController {
    private final SeasonService seasonService;

    @Autowired
    public SeasonController(SeasonService seasonService) {
        this.seasonService = seasonService;
    }

    @PutMapping("/active-season")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> startNewSeason(@PathVariable String groupId,
                                                                      @RequestBody SeasonCreateDto dto,
                                                                      @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (dto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_NAME);
        }

        if (dto.invalidRuleMoves()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_RULE_MOVES);
        }

        var season = seasonService.startNewSeason(dto, groupId, user);

        if (season != null) {
            return ResponseEnvelope.ok(season);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping("/seasons")
    public ResponseEntity<ResponseEnvelope<List<SeasonDto>>> getAllSeasons(@PathVariable String groupId) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        return ResponseEnvelope.ok(seasonService.getAllSeasons(groupId));
    }

    @GetMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> getSeasonById(@PathVariable String groupId, @PathVariable String id) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_ID);
        }

        var season = seasonService.getSeasonById(id);

        if (season != null && season.getGroupId().equals(groupId)) {
            return ResponseEnvelope.ok(season);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @PutMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> updateSeasonById(@PathVariable String groupId, @PathVariable String id, @RequestBody SeasonUpdateDto dto) {
        if (groupId == null || groupId.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_ID);
        }

        if (dto == null || dto.getSeasonSettings() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_DTO);
        }

        var season = seasonService.getRawSeasonById(id);

        if (season.isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        } else if (!season.get().getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (season.get().getEndDate() != null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_ALREADY_ENDED);
        }

        if (dto.getSeasonSettings().getWakeTimeHour() != null &&
                (dto.getSeasonSettings().getWakeTimeHour() < 0 || dto.getSeasonSettings().getWakeTimeHour() > 23)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_WRONG_TIME_FORMAT);
        } else if ((dto.getSeasonSettings().getMinTeamSize() != null ? dto.getSeasonSettings().getMinTeamSize() : season.get().getSeasonSettings().getMinTeamSize()) >
                (dto.getSeasonSettings().getMaxTeamSize() != null ? dto.getSeasonSettings().getMaxTeamSize() : season.get().getSeasonSettings().getMaxTeamSize())) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_WRONG_TEAM_SIZES);
        }

        dto.getSeasonSettings().setMinMatchesToQualify(Math.min(Math.max(dto.getSeasonSettings().getMinMatchesToQualify(), 0), 1000));
        dto.getSeasonSettings().setMinTeamSize(Math.min(Math.max(dto.getSeasonSettings().getMinTeamSize(), 1), 10));
        dto.getSeasonSettings().setMaxTeamSize(Math.min(Math.max(dto.getSeasonSettings().getMaxTeamSize(), 1), 10));

        SeasonDto updatedSeason = seasonService.updateSeason(season.get(), dto);
        if (updatedSeason != null) {
            return ResponseEnvelope.ok(updatedSeason);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}