package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}")
public class RuleController {
    private final RuleService ruleService;

    @Autowired
    public RuleController(RuleService ruleService) {
        this.ruleService = ruleService;
    }

    @PutMapping("/rules")
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> rules(@PathVariable String groupId, @PathVariable String seasonId, @RequestBody List<RuleCreateDto> rules) {
        var ruleDtos = ruleService.writeRules(seasonId, rules);

        if (ruleDtos != null) {
            if (ruleDtos.stream().allMatch(ruleDto -> ruleDto.getSeason().getId().equals(seasonId) && ruleDto.getSeason().getGroupId().equals(groupId))) {
                return ResponseEnvelope.ok(ruleDtos);
            } else {
                return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.RULE_VALIDATION_FAILED);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}