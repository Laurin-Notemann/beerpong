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

@Service
public class RuleService {
    private final RuleRepository ruleRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMapper ruleMapper;

    @Autowired
    public RuleService(RuleRepository matchRepository, SeasonRepository seasonRepository, RuleMapper ruleMapper) {
        this.ruleRepository = matchRepository;
        this.seasonRepository = seasonRepository;
        this.ruleMapper = ruleMapper;
    }

    @Transactional
    public List<RuleDto> writeRules(String seasonId, List<RuleCreateDto> rules) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();

        ruleRepository.deleteBySeasonId(seasonId);

        return rules.stream()
                .map(dto -> {
                    var rule = ruleMapper.ruleCreateDtoToRule(dto);
                    rule.setSeason(season);
                    return rule;
                })
                .map(rule -> ruleMapper.ruleToRuleDto(ruleRepository.save(rule)))
                .toList();
    }

    public List<RuleDto> getAllRules(String seasonId) {
        return ruleRepository.findBySeasonId(seasonId)
                .stream()
                .map(ruleMapper::ruleToRuleDto)
                .toList();
    }
}