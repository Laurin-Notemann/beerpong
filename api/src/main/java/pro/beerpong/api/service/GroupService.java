package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.GroupMemberRepository;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static pro.beerpong.api.util.RandomStringGenerator.generateRandomString;

@Service
@RequiredArgsConstructor
public class GroupService {
    public static int GROUP_INVITE_CODE_LENGTH = 9;

    private final AssetService assetService;
    private final SubscriptionHandler subscriptionHandler;
    private final GroupRepository groupRepository;
    private final SeasonRepository seasonRepository;
    private final ProfileService profileService;
    private final GroupMapper groupMapper;
    private final MatchRepository matchRepository;
    private final PlayerService playerService;
    private final RuleMoveService ruleMoveService;
    private final RuleService ruleService;
    private final GroupMemberRepository groupMemberRepository;
    private final AuthService authService;

    public GroupDto createGroup(GroupCreateDto groupCreateDto, UserDto user) {
        Group group = groupMapper.groupCreateDtoToGroup(groupCreateDto);
        group.setInviteCode(generateRandomString(GROUP_INVITE_CODE_LENGTH));
        group.setCreatedAt(ZonedDateTime.now());

        if (group.getSportPreset() != null && group.getCustomSportName() != null) {
            group.setCustomSportName(null);
        } else if ((group.getCustomSportName() != null && group.getCustomSportName().isBlank()) ||
                (group.getSportPreset() == null && group.getCustomSportName() == null)) {
            return null;
        }

        var groupMember = authService.buildFirstGroupMember(user);

        var season = new Season();
        season.setStartDate(ZonedDateTime.now());
        season.setSeasonSettings(SeasonSettings.createDefault());

        group.setActiveSeason(season);
        group = groupRepository.save(group);

        groupMember.setGroup(group);

        groupMember = authService.saveMember(groupMember);

        // TODO maybe find way to prevent double group saving. but not that big of a deal
        group.setCreatedBy(groupMember);
        group = groupRepository.save(group);

        season.setCreatedBy(groupMember);
        season.setGroupId(group.getId());
        seasonRepository.save(season);

        Group finalGroup = group;
        GroupMember finalGroupMember = groupMember;
        groupCreateDto.getProfileNames().forEach(s -> {
            var profileDto = new ProfileCreateDto();
            profileDto.setName(s);
            profileService.createProfile(finalGroup.getId(), profileDto, finalGroupMember);
        });

        ruleMoveService.createDefaultRuleMoves(group, season);
        ruleService.createDefaultRules(season, groupCreateDto.getSportPreset(), groupMember);

        return withStats(groupMapper.groupToGroupDto(group));
    }

    public List<GroupDto> findGroupsByUser(UserDto user) {
        return groupMemberRepository.findByUserId(user.getId()).stream()
                .filter(GroupMember::isActive)
                .map(groupMember -> withStats(groupRepository.findById(groupMember.getGroup().getId())
                        .map(groupMapper::groupToGroupDto)
                        .orElse(null)))
                .filter(Objects::nonNull)
                .toList();
    }

    public GroupDto findGroupsByInviteCode(String inviteCode) {
        return withStats(groupRepository.findByInviteCode(inviteCode)
                .map(groupMapper::groupToGroupDto)
                .orElse(null));
    }

    public List<GroupDto> getAllGroups() {
        return groupRepository.findAll()
                .stream()
                .map(groupMapper::groupToGroupDto)
                .collect(Collectors.toList());
    }

    public GroupDto getGroupById(String id) {
        return withStats(getRawGroupById(id));
    }

    public GroupDto getRawGroupById(String id) {
        return groupRepository.findById(id)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);
    }

    public Group getDaoById(String id) {
        return groupRepository.findById(id).orElse(null);
    }

    public GroupDto updateGroup(String id, GroupCreateDto groupCreateDto) {
        return groupRepository.findById(id)
                .map(existingGroup -> {
                    existingGroup.setName(groupCreateDto.getName());
                    var dto = withStats(groupMapper.groupToGroupDto(groupRepository.save(existingGroup)));

                    if (dto == null) {
                        return null;
                    }

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_UPDATE, dto.getId(), dto));

                    return dto;
                })
                .orElse(null);
    }

    @Transactional
    public AssetMetadataDto storeWallpaper(GroupDto groupDto, byte[] content, String contentType) {
        String oldWallpaperAssetId = null;

        if (groupDto.getWallpaperAsset() != null) {
            oldWallpaperAssetId = groupDto.getWallpaperAsset().getId();
        }

        var assetMetadataDto = assetService.storeAsset(content, contentType);

        groupDto.setWallpaperAsset(assetMetadataDto);

        groupRepository.save(groupMapper.groupDtoToGroup(groupDto));

        if (oldWallpaperAssetId != null) {
            assetService.deleteAsset(oldWallpaperAssetId);
        }

        return assetMetadataDto;
    }

    private GroupDto withStats(@Nullable GroupDto groupDto) {
        if (groupDto == null) {
            return null;
        } else if (groupDto.getActiveSeason() == null) {
            return groupDto;
        }

        groupDto.setNumberOfMatches(matchRepository.findBySeasonId(groupDto.getActiveSeason().getId()).size());
        groupDto.setNumberOfPlayers(playerService.getBySeasonId(groupDto.getActiveSeason().getId()).size());
        groupDto.setNumberOfSeasons(seasonRepository.findByGroupId(groupDto.getId()).size());

        return groupDto;
    }
}