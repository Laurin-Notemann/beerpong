package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.rules.RuleCreateDto;
import pro.beerpong.api.model.dto.rules.RuleDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.service.RuleService;
import pro.beerpong.api.service.SeasonService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/groups/{groupId}/seasons/{seasonId}/rules")
public class RuleController {
    private final SubscriptionHandler subscriptionHandler;

    private final RuleService ruleService;
    private final SeasonService seasonService;
    private final SeasonRepository seasonRepository;

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<RuleDto>>> getRules(@PathVariable String groupId, @PathVariable String seasonId) {
        if (!seasonRepository.existsByIdAndGroupId(seasonId, groupId)) {
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

        var response = seasonService.validateActiveSeason(groupId, seasonId);

        if (response.isError()) {
            return ResponseEnvelope.notOk(response.getErrorCode());
        }

        if (rules.stream().anyMatch(RuleCreateDto::invalidDto)) {
            return ResponseEnvelope.notOk(ErrorCodes.RULE_INVALID_DTO);
        }

        var ruleDtos = ruleService.writeRules(groupId, seasonId, rules, user);

        if (ruleDtos != null) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULES_WRITE, groupId, ruleDtos.toArray(new RuleDto[0])));

            return ResponseEnvelope.ok(ruleDtos);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        }
    }
}
