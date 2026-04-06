package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dto.rules.RuleCreateDto;
import pro.beerpong.api.model.dto.rules.RuleDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface RuleMapper {
    Rule ruleCreateDtoToRule(RuleCreateDto dto);

    @Mapping(source = "createdBy.id", target = "createdById")
    @Mapping(source = "season.id", target = "seasonId")
    RuleDto ruleToRuleDto(Rule rule);
}
