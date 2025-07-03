package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.RuleService;
import pro.beerpong.api.service.SeasonService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rules")
public class RuleController {
    private final RuleService ruleService;
    private final SeasonService seasonService;
    private final SubscriptionHandler subscriptionHandler;

    @Autowired
    public RuleController(RuleService ruleService, SeasonService seasonService, SubscriptionHandler subscriptionHandler) {
        this.ruleService = ruleService;
        this.seasonService = seasonService;
        this.subscriptionHandler = subscriptionHandler;
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> getRules(@PathVariable String groupId, @PathVariable String seasonId) {
        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ResponseEnvelope.ok(ruleService.getAllRules(seasonId));
    }

    @PutMapping
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> writeRules(@PathVariable String groupId,
                                                                      @PathVariable String seasonId,
                                                                      @RequestBody List<RuleCreateDto> rules,
                                                                      @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        var pair = seasonService.getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        } else if (pair.getSecond().getEndDate() != null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_ALREADY_ENDED);
        } else if (rules.stream().anyMatch(RuleCreateDto::invalidDto)) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_INVALID_DTO);
        }

        var ruleDtos = ruleService.writeRules(groupId, pair.getSecond(), rules, user);

        if (ruleDtos != null) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULES_WRITE, groupId, ruleDtos.toArray(new RuleDto[0])));

            return ResponseEnvelope.ok(ruleDtos);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}
