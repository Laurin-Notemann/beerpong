package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
import pro.beerpong.api.model.dto.seasons.SeasonUpdateDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.SeasonService;
import pro.beerpong.api.sockets.LocalTimeAdapter;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}")
public class SeasonController {
    private final SeasonService seasonService;
    private final SeasonRepository seasonRepository;

    @Autowired
    public SeasonController(SeasonService seasonService, SeasonRepository seasonRepository) {
        this.seasonService = seasonService;
        this.seasonRepository = seasonRepository;
    }

    @PutMapping("/active-season")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> startNewSeason(@PathVariable String groupId,
                                                                      @RequestBody SeasonCreateDto dto,
                                                                      @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (dto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_SEASON_NAME);
        }

        if (dto.invalidRuleMoves()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_RULE_MOVES);
        }

        var season = seasonService.startNewSeason(dto, groupId, user);

        if (season.isOk()) {
            return ResponseEnvelope.ok(season.getData());
        } else {
            return ResponseEnvelope.notOk(season.getErrorCode());
        }
    }

    @GetMapping("/seasons")
    public ResponseEntity<ResponseEnvelope<List<SeasonDto>>> getAllSeasons(@PathVariable String groupId) {
        return ResponseEnvelope.ok(seasonService.getSeasonsByGroupId(groupId));
    }

    @GetMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> getSeasonById(@PathVariable String groupId, @PathVariable String id) {
        if (!seasonRepository.existsByIdAndGroupId(id, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var season = seasonService.getSeasonById(id);

        return season.map(ResponseEnvelope::ok).orElseGet(() -> ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND));
    }

    @PutMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> updateSeasonById(@PathVariable String groupId, @PathVariable String id, @RequestBody SeasonUpdateDto dto) {
        if (!seasonRepository.existsByIdAndGroupId(id, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        var response = seasonService.validateActiveSeason(groupId, id);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        var pair = response.getData();
        var settings = pair.getSecond().getSeasonSettings();

        var minMatches = (dto.getSeasonSettings().getMinMatchesToQualify() != null ? dto.getSeasonSettings().getMinMatchesToQualify() : settings.getMinMatchesToQualify());
        var minTeamSize = (dto.getSeasonSettings().getMinTeamSize() != null ? dto.getSeasonSettings().getMinTeamSize() : settings.getMinTeamSize());
        var maxTeamSize = (dto.getSeasonSettings().getMaxTeamSize() != null ? dto.getSeasonSettings().getMaxTeamSize() : settings.getMaxTeamSize());

        LocalTime wakeTime = settings.getWakeTime();

        if (dto.getSeasonSettings().getWakeTime() != null) {
            try {
                wakeTime = LocalTime.parse(dto.getSeasonSettings().getWakeTime(), LocalTimeAdapter.FORMATTER);
            } catch (DateTimeParseException e) {
                wakeTime = null;
            }
        }

        if (wakeTime == null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_WRONG_TIME_FORMAT);
        } else if (minTeamSize > maxTeamSize) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_WRONG_TEAM_SIZES);
        }

        dto.getSeasonSettings().setMinMatchesToQualify(Math.min(Math.max(minMatches, 0), 1000));
        dto.getSeasonSettings().setMinTeamSize(Math.min(Math.max(minTeamSize, 1), 10));
        dto.getSeasonSettings().setMaxTeamSize(Math.min(Math.max(maxTeamSize, 1), 10));

        SeasonDto updatedSeason = seasonService.updateSeason(pair.getSecond(), dto);
        
        if (updatedSeason != null) {
            return ResponseEnvelope.ok(updatedSeason);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}