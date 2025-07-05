package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.SeasonDto;

@Mapper(componentModel = "spring")
public interface SeasonMapper {
    SeasonDto seasonToSeasonDto(Season season);
}