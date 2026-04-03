package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dto.rules.RuleCreateDto;
import pro.beerpong.api.model.dto.rules.RuleDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface RuleMapper {
    Rule ruleCreateDtoToRule(RuleCreateDto dto);

    RuleDto ruleToRuleDto(Rule rule);
}
