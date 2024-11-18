package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.RuleMapper;
import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;
import pro.beerpong.api.repository.RuleRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@Service
public class RuleService {
    private final SubscriptionHandler subscriptionHandler;
    private final RuleRepository ruleRepository;

    private final RuleMapper ruleMapper;

    @Autowired
    public RuleService(SubscriptionHandler subscriptionHandler, RuleRepository matchRepository, RuleMapper ruleMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.ruleRepository = matchRepository;
        this.ruleMapper = ruleMapper;
    }

    @Transactional
    public List<RuleDto> writeRules(String groupId, Season season, List<RuleCreateDto> rules) {
        ruleRepository.deleteBySeasonId(season.getId());

        var dtos = rules.stream()
                .map(dto -> {
                    var rule = ruleMapper.ruleCreateDtoToRule(dto);
                    rule.setSeason(season);
                    return rule;
                })
                .filter(dto -> dto.getSeason().getId().equals(season.getId()) &&
                        dto.getSeason().getGroupId().equals(groupId))
                .map(rule -> ruleMapper.ruleToRuleDto(ruleRepository.save(rule)))
                .toList();

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULES_WRITE, groupId, dtos.toArray(new RuleDto[0])));

        return dtos;
    }

    public void copyRulesFromOldSeason(Season oldSeason, Season newSeason) {
        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return;
        }

        ruleRepository.findBySeasonId(oldSeason.getId()).forEach(oldRule -> {
            var ruleMove = new Rule();

            ruleMove.setTitle(oldRule.getTitle());
            ruleMove.setDescription(oldRule.getDescription());
            ruleMove.setSeason(newSeason);

            ruleRepository.save(ruleMove);
        });
    }

    public List<RuleDto> getAllRules(String seasonId) {
        return ruleRepository.findBySeasonId(seasonId)
                .stream()
                .map(ruleMapper::ruleToRuleDto)
                .toList();
    }
}