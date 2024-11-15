package pro.beerpong.api.control;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.model.dto.SeasonCreateDto;
import pro.beerpong.api.model.dto.SeasonDto;
import pro.beerpong.api.service.SeasonService;

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
        var season = seasonService.getSeasonById(groupId, id);

        if (season != null && season.getGroup().getId().equals(groupId)) {
            return ResponseEnvelope.ok(season);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}