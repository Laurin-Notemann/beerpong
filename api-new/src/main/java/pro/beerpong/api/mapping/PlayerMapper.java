package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dto.player.PlayerCreateDto;
import pro.beerpong.api.model.dto.player.PlayerDto;

@Mapper(componentModel = "spring", uses = PlayerStatisticsMapper.class)
public interface PlayerMapper {
    @Mapping(source = "profile.id", target = "profileId")
    @Mapping(source = "season.id", target = "seasonId")
    @Mapping(source = "statistics.id", target = "statisticsId")
    PlayerDto playerToPlayerDto(Player player);

    Player playerCreateDtoToPlayer(PlayerCreateDto dto);

    @Mapping(source = "profileId", target = "profile.id")
    @Mapping(source = "seasonId", target = "season.id")
    @Mapping(source = "statisticsId", target = "statistics.id")
    Player playerDtoToPlayer(PlayerDto dto);
}
