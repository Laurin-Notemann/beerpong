package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;

@Mapper(componentModel = "spring")
public interface GroupMapper {
    Group groupCreateDtoToGroup(GroupCreateDto groupDto);
    GroupDto groupToGroupDto(Group groupDto);
}
