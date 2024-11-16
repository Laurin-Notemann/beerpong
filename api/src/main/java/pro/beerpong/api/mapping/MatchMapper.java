package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;

import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.MatchDto;

@Mapper(componentModel = "spring")
public interface MatchMapper {
    MatchDto matchToMatchDto(Match match);
}
