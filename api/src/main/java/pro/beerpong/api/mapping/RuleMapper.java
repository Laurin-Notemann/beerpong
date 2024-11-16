package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;

import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;

@Mapper(componentModel = "spring")
public interface RuleMapper {
    Rule ruleCreateDtoToRule(RuleCreateDto dto);
    RuleDto ruleToRuleDto(Rule rule);
}
