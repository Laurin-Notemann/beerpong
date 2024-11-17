package pro.beerpong.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import pro.beerpong.api.mapping.RuleMapper;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;
import pro.beerpong.api.repository.RuleRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

@Service
public class RuleService {
    private final SubscriptionHandler subscriptionHandler ;
    private final RuleRepository ruleRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMapper ruleMapper;

    @Autowired
    public RuleService(SubscriptionHandler subscriptionHandler , RuleRepository matchRepository, SeasonRepository seasonRepository, RuleMapper ruleMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.ruleRepository = matchRepository;
        this.seasonRepository = seasonRepository;
        this.ruleMapper = ruleMapper;
    }

    @Transactional
    public List<RuleDto> writeRules(String groupId, String seasonId, List<RuleCreateDto> rules) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();

        ruleRepository.deleteBySeasonId(seasonId);

        var dtos = rules.stream()
                .map(dto -> {
                    var rule = ruleMapper.ruleCreateDtoToRule(dto);
                    rule.setSeason(season);
                    return rule;
                })
                .filter(dto -> dto.getSeason().getId().equals(seasonId) &&
                        dto.getSeason().getGroupId().equals(groupId))
                .map(rule -> ruleMapper.ruleToRuleDto(ruleRepository.save(rule)))
                .toList();

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULES_WRITE, groupId, dtos.toArray(new RuleDto[0])));

        return dtos;
    }

    public List<RuleDto> getAllRules(String seasonId) {
        return ruleRepository.findBySeasonId(seasonId)
                .stream()
                .map(ruleMapper::ruleToRuleDto)
                .toList();
    }
}