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
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
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
    public ResponseEntity<ResponseEnvelope<RuleDto[]>> getRules(@PathVariable String groupId, @PathVariable String seasonId) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateSeason(RuleDto[].class, pair);

        if (error != null || pair.getFirst() == null || pair.getSecond() == null) {
            return error;
        }

        return ResponseEnvelope.ok(ruleService.getAllRules(seasonId).toArray(new RuleDto[0]));
    }

    @PutMapping
    public ResponseEntity<ResponseEnvelope<RuleDto[]>> writeRules(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody List<RuleCreateDto> rules) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);
        var error = seasonService.validateActiveSeason(RuleDto[].class, pair);

        if (error != null || pair.getFirst() == null || pair.getSecond() == null) {
            return error;
        }

        var ruleDtos = ruleService.writeRules(groupId, pair.getSecond(), rules);

        if (ruleDtos != null) {
            return ResponseEnvelope.ok(ruleDtos);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}