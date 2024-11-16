package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;

import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dto.RuleCreateDto;
import pro.beerpong.api.model.dto.RuleDto;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;

@Mapper(componentModel = "spring")
public interface RuleMoveMapper {
    RuleMove ruleMoveCreateDtoToRuleMove(RuleMoveCreateDto dto);
    RuleMoveDto ruleMoveToRuleMoveDto(RuleMove move);
}
