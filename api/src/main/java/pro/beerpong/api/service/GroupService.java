package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.GroupSettings;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

import static pro.beerpong.api.util.RandomStringGenerator.generateRandomString;

@Service
public class GroupService {
    private final SubscriptionHandler subscriptionHandler ;

    private final GroupRepository groupRepository;
    private final SeasonRepository seasonRepository;
    private final ProfileService profileService;
    private final GroupMapper groupMapper;

    @Autowired
    public GroupService(SubscriptionHandler subscriptionHandler , GroupRepository groupRepository, ProfileService profileService, SeasonRepository seasonRepository, GroupMapper groupMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.groupRepository = groupRepository;
        this.seasonRepository = seasonRepository;
        this.profileService = profileService;
        this.groupMapper = groupMapper;
    }

    public GroupDto createGroup(GroupCreateDto groupCreateDto) {
        Group group = groupMapper.groupCreateDtoToGroup(groupCreateDto);
        group.setInviteCode(generateRandomString(9));
        group.setGroupSettings(new GroupSettings());

        var season = new Season();
        season.setStartDate(ZonedDateTime.now());

        group.setActiveSeason(season);
        group = groupRepository.save(group);

        season.setGroupId(group.getId());
        seasonRepository.save(season);

        Group finalGroup = group;
        groupCreateDto.getProfileNames().forEach(s -> {
            var profileDto = new ProfileCreateDto();
            profileDto.setName(s);
            profileService.createProfile(finalGroup.getId(), profileDto);
        });

        var dto = groupMapper.groupToGroupDto(group);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_CREATE, group.getId(), dto));

        return dto;
    }

    public GroupDto findGroupsByInviteCode(String inviteCode) {
        return groupRepository.findByInviteCode(inviteCode)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);
    }

    public List<GroupDto> getAllGroups() {
        return groupRepository.findAll()
                .stream()
                .map(groupMapper::groupToGroupDto)
                .collect(Collectors.toList());
    }

    public GroupDto getGroupById(String id) {
        return groupRepository.findById(id)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);
    }

    public GroupDto updateGroup(String id, GroupCreateDto groupCreateDto) {
        return groupRepository.findById(id)
                .map(existingGroup -> {
                    existingGroup.setName(groupCreateDto.getName());
                    var dto = groupMapper.groupToGroupDto(groupRepository.save(existingGroup));

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_UPDATE, dto.getId(), dto));

                    return dto;
                })
                .orElse(null);
    }
}
