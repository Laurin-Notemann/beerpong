package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;

@Mapper(componentModel = "spring")
public interface RuleMoveMapper {
    RuleMove ruleMoveCreateDtoToRuleMove(RuleMoveCreateDto dto);

    @Mapping(source = "seasonId", target = "season.id")
    RuleMove ruleMoveDtoToRuleMove(RuleMoveDto dto);

    @Mapping(source = "season.id", target = "seasonId")
    RuleMoveDto ruleMoveToRuleMoveDto(RuleMove move);
}
