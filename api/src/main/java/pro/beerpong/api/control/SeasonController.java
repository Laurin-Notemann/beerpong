package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ResponseEnvelope<SeasonDto>> startNewSeason(@PathVariable String groupId, @RequestBody SeasonCreateDto dto) {
        var season = seasonService.startNewSeason(dto, groupId);

        if (season != null) {
            return ResponseEnvelope.ok(season);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping("/seasons")
    public ResponseEntity<ResponseEnvelope<List<SeasonDto>>> getAllSeasons(@PathVariable String groupId) {
        return ResponseEnvelope.ok(seasonService.getAllSeasons(groupId));
    }

    @GetMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> getSeasonById(@PathVariable String groupId, @PathVariable String id) {
        var season = seasonService.getSeasonById(id);

        if (season != null && season.getGroupId().equals(groupId)) {
            return ResponseEnvelope.ok(season);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }

    @PutMapping("/seasons/{id}")
    public ResponseEntity<ResponseEnvelope<SeasonDto>> updateSeasonById(@PathVariable String groupId, @PathVariable String id, @RequestBody SeasonUpdateDto dto) {
        var season = seasonService.getRawSeasonById(id);

        if (season.isEmpty()) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!season.get().getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (season.get().getEndDate() != null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_ALREADY_ENDED);
        }

        if (dto.getSeasonSettings().getWakeTimeHour() < 0 || dto.getSeasonSettings().getWakeTimeHour() > 23) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_WRONG_TIME_FORMAT);
        } else if (dto.getSeasonSettings().getMinTeamSize() > dto.getSeasonSettings().getMaxTeamSize()) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_WRONG_TEAM_SIZES);
        }

        dto.getSeasonSettings().setMinMatchesToQualify(Math.min(Math.max(dto.getSeasonSettings().getMinMatchesToQualify(), 0), 1000));
        dto.getSeasonSettings().setMinTeamSize(Math.min(Math.max(dto.getSeasonSettings().getMinTeamSize(), 1), 10));
        dto.getSeasonSettings().setMaxTeamSize(Math.min(Math.max(dto.getSeasonSettings().getMinMatchesToQualify(), 1), 10));

        SeasonDto updatedSeason = seasonService.updateSeason(season.get(), dto);
        if (updatedSeason != null) {
            return ResponseEnvelope.ok(updatedSeason);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}