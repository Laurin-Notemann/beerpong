package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.TeamDto;

@Mapper(componentModel = "spring")
public interface TeamMapper {
    @Mapping(source = "match.id", target = "matchId")
    TeamDto teamToTeamDto(Team team);
}
