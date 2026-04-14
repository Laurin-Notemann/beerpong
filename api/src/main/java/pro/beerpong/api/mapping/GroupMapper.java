package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.control.GroupPresetsController;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dto.groups.GroupCreateDto;
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.groups.GroupPreset;

@Mapper(componentModel = "spring")
public abstract class GroupMapper {
    @Mapping(target = "sportPreset", expression = "java(fromPreset(groupDto))")
    @Mapping(source = "activeSeasonId", target = "activeSeason.id")
    @Mapping(source = "assetIdWallpaper", target = "wallpaper.id")
    @Mapping(source = "createdById", target = "createdBy.id")
    public abstract Group groupDtoToGroup(GroupDto groupDto);

    @Mapping(target = "sportPreset", expression = "java(fromDto(groupDto))")
    public abstract Group groupCreateDtoToGroup(GroupCreateDto groupDto);

    @Mapping(target = "sportPreset", expression = "java(groupPreset(group))")
    @Mapping(source = "activeSeason.id", target = "activeSeasonId")
    @Mapping(source = "wallpaper.id", target = "assetIdWallpaper")
    @Mapping(source = "createdBy.id", target = "createdById")
    public abstract GroupDto groupToGroupDto(Group group);

    protected String fromDto(GroupCreateDto groupDto) {
        return GroupPresetsController.byId(groupDto.getSportPreset()).isPresent() ? groupDto.getSportPreset() : null;
    }

    protected String fromPreset(GroupDto groupDto) {
        return (groupDto.getSportPreset() == null ? null : groupDto.getSportPreset().id());
    }

    protected GroupPreset groupPreset(Group group) {
        return GroupPresetsController.byId(group.getSportPreset()).orElse(null);
    }
}