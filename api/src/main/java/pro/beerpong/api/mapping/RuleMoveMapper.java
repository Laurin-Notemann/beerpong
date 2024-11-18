package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;

@Mapper(componentModel = "spring")
public interface RuleMoveMapper {
    RuleMove ruleMoveCreateDtoToRuleMove(RuleMoveCreateDto dto);

    RuleMove ruleMoveDtoToRuleMove(RuleMoveDto dto);

    RuleMoveDto ruleMoveToRuleMoveDto(RuleMove move);
}
