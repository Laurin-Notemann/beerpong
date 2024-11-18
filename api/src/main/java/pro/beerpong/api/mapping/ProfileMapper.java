package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface ProfileMapper {
    @Mapping(source = "groupId", target = "group.id")
    Profile profileDtoToProfile(ProfileDto profileDto);
    Profile profileCreateDtoToProfile(ProfileCreateDto profileCreateDto);
    @Mapping(source = "group.id", target = "groupId")
    ProfileDto profileToProfileDto(Profile profile);
}
