package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.GroupMemberDto;
import pro.beerpong.api.model.dto.TeamDto;

@Mapper(componentModel = "spring")
public interface GroupMemberMapper {
    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "user.id", target = "userId")
    GroupMemberDto groupMemberToGroupMemberDto(GroupMember groupMember);
}
