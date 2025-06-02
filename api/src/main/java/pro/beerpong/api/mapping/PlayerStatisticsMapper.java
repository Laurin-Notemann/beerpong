package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;
import pro.beerpong.api.model.dto.PlayerCreateDto;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.model.dto.PlayerStatisticsDto;

@Mapper(componentModel = "spring")
public interface PlayerStatisticsMapper {
    PlayerStatistics playerStatisticsDtoToPlayerStatistics(PlayerStatisticsDto playerStatisticsDto);

    PlayerStatisticsDto playerStatisticsToPlayerStatisticsDto(PlayerStatistics dto);
}
