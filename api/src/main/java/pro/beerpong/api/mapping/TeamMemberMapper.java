package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.TeamMemberDto;

@Mapper(componentModel = "spring")
public interface TeamMemberMapper {
    @Mapping(source = "team.id", target = "teamId")
    @Mapping(source = "player.id", target = "playerId")
    TeamMemberDto teamMemberToTeamMemberDto(TeamMember teamMember);
}
