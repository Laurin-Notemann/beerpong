package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.PlayerStatistics;
import pro.beerpong.api.model.dto.player.PlayerStatisticsDto;

@Mapper(componentModel = "spring")
public interface PlayerStatisticsMapper {
    PlayerStatistics playerStatisticsDtoToPlayerStatistics(PlayerStatisticsDto playerStatisticsDto);

    PlayerStatisticsDto playerStatisticsToPlayerStatisticsDto(PlayerStatistics dto);
}
