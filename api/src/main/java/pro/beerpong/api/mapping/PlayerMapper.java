package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dto.PlayerDto;

@Mapper(componentModel = "spring")
public interface PlayerMapper {
    // Konvertiert eine Player-Entity in ein PlayerDto
    @Mapping(source = "profile.id", target = "profileId")
    @Mapping(source = "season.id", target = "seasonId")
    PlayerDto playerToPlayerDto(Player player);

    // Konvertiert ein PlayerDto in eine Player-Entity
    @Mapping(target = "profile", ignore = true)
    @Mapping(target = "season", ignore = true)
    Player playerDtoToPlayer(PlayerDto playerDto);
}
