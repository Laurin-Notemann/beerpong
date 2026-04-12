package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.teams.TeamDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface TeamMapper {
    @Mapping(source = "match.id", target = "matchId")
    @Mapping(source = "photo.id", target = "photoAssetId")
    TeamDto teamToTeamDto(Team team);

    @Mapping(source = "matchId", target = "match.id")
    @Mapping(source = "photoAssetId", target = "photo.id")
    Team teamDtoToTeam(TeamDto teamDto);
}
