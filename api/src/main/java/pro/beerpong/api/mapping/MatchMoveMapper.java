package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dto.MatchMoveDtoComplete;

@Mapper(componentModel = "spring")
public interface MatchMoveMapper {
    @Mapping(source = "teamMember.id", target = "teamMemberId")
    @Mapping(source = "move.id", target = "moveId")
    MatchMoveDtoComplete matchMoveToMatchMoveDtoComplete(MatchMove matchMove);
}
