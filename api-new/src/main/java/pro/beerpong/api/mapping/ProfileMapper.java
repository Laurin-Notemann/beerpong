package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.profile.ProfileCreateDto;
import pro.beerpong.api.model.dto.profile.ProfileDto;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public interface ProfileMapper {
    @Mapping(source = "groupId", target = "group.id")
    @Mapping(source = "createdBy", target = "createdBy.id")
    @Mapping(source = "assetIdAvatar", target = "avatar.id")
    Profile profileDtoToProfile(ProfileDto profileDto);

    Profile profileCreateDtoToProfile(ProfileCreateDto profileCreateDto);

    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "createdBy.id", target = "createdBy")
    @Mapping(source = "avatar.id", target = "assetIdAvatar")
    ProfileDto profileToProfileDto(Profile profile);
}
