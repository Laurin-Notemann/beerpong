package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;

@Mapper(componentModel = "spring")
public interface ProfileMapper {
    Profile profileCreateDtoToProfile(ProfileCreateDto profileCreateDto);
    ProfileDto profileToProfileDto(Profile profile);
}
