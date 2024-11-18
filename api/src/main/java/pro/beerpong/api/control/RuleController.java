package pro.beerpong.api.control;

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
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;
import pro.beerpong.api.service.RuleService;
import pro.beerpong.api.service.SeasonService;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rules")
public class RuleController {
    private final RuleService ruleService;
    private final SeasonService seasonService;

    @Autowired
    public RuleController(RuleService ruleService, SeasonService seasonService) {
        this.ruleService = ruleService;
        this.seasonService = seasonService;
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> getRules(@PathVariable String groupId, @PathVariable String seasonId) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(ruleService.getAllRules(seasonId));
    }

    @PutMapping
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> writeRules(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody List<RuleCreateDto> rules) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (pair.getSecond().getEndDate() != null) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_ALREADY_ENDED);
        }

        var ruleDtos = ruleService.writeRules(groupId, pair.getSecond(), rules);

        if (ruleDtos != null) {
            return ResponseEnvelope.ok(ruleDtos);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}