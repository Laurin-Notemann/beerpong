package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.seasons.SeasonDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface SeasonMapper {
    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "createdBy.id", target = "createdBy")
    SeasonDto seasonToSeasonDto(Season season);
}