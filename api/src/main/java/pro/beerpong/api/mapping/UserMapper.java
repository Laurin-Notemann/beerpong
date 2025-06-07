package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.User;
import pro.beerpong.api.model.dto.TeamDto;
import pro.beerpong.api.model.dto.UserDto;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto userToUserDto(User user);
}
