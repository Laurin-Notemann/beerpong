package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dto.PlayerCreateDto;
import pro.beerpong.api.model.dto.PlayerDto;

@Mapper(componentModel = "spring", uses = ProfileMapper .class)
public interface PlayerMapper {
    PlayerDto playerToPlayerDto(Player player);

    Player playerCreateDtoToPlayer(PlayerCreateDto dto);
}
