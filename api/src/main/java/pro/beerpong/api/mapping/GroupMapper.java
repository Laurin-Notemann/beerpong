package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.web.util.UriComponentsBuilder;
import pro.beerpong.api.control.GroupPresetsController;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.GroupPreset;

@Mapper(componentModel = "spring", uses = AssetMapper.class)
public abstract class GroupMapper {
    @Mapping(target = "sportPreset", expression = "java(fromPreset(groupDto))")
    public abstract Group groupDtoToGroup(GroupDto groupDto);
    @Mapping(target = "sportPreset", expression = "java(fromDto(groupDto))")
    public abstract Group groupCreateDtoToGroup(GroupCreateDto groupDto);
    @Mapping(target = "sportPreset", expression = "java(groupPreset(group))")
    public abstract GroupDto groupToGroupDto(Group group);

    protected String fromDto(GroupCreateDto groupDto) {
        return GroupPresetsController.byId(groupDto.getSportPreset()).isPresent() ? groupDto.getSportPreset() : null;
    }

    protected String fromPreset(GroupDto groupDto) {
        return (groupDto.getSportPreset() == null ? null : groupDto.getSportPreset().getId());
    }

    protected GroupPreset groupPreset(Group group) {
        return GroupPresetsController.byId(group.getSportPreset()).orElse(null);
    }
}