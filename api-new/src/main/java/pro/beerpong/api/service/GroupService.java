package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.assets.AssetCropDto;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.groups.GroupCreateDto;
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.profile.ProfileCreateDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.AssetType;

import java.time.ZonedDateTime;
import java.util.Optional;

import static pro.beerpong.api.util.RandomStringGenerator.generateRandomString;

@Service
@RequiredArgsConstructor
public class GroupService {
    public static int GROUP_INVITE_CODE_LENGTH = 9;

    private final SubscriptionHandler subscriptionHandler;

    private final GroupRepository groupRepository;
    private final SeasonRepository seasonRepository;
    private final MatchRepository matchRepository;
    private final GroupMemberRepository groupMemberRepository;

    private final AuthService authService;
    private final AssetService assetService;
    private final ProfileService profileService;
    private final RuleMoveService ruleMoveService;
    private final RuleService ruleService;

    private final GroupMapper groupMapper;
    private final PlayerRepository playerRepository;

    @Transactional
    public ServiceResponse<GroupDto> createGroup(GroupCreateDto groupCreateDto, UserDto user) {
        Group group = groupMapper.groupCreateDtoToGroup(groupCreateDto);

        group.setInviteCode(generateRandomString(GROUP_INVITE_CODE_LENGTH));
        group.setCreatedAt(ZonedDateTime.now());

        if (group.getSportPreset() != null && group.getCustomSportName() != null) {
            group.setCustomSportName(null);
        } else if ((group.getCustomSportName() != null && group.getCustomSportName().isBlank()) ||
                (group.getSportPreset() == null && group.getCustomSportName() == null)) {
            return ServiceResponse.error(ErrorCodes.INVALID_GROUP_SPORT);
        }

        var groupMember = authService.buildFirstGroupMember(user);

        var season = new Season();
        season.setStartDate(ZonedDateTime.now());
        season.setSeasonSettings(SeasonSettings.createDefault());

        group.setActiveSeason(season);
        group = groupRepository.save(group);

        groupMember.setGroup(group);
        groupMember = groupMemberRepository.save(groupMember);

        // future: maybe find way to prevent double group saving. but not that big of a deal
        group.setCreatedBy(groupMember);

        season.setCreatedBy(groupMember);
        season.setGroup(group);

        season = seasonRepository.save(season);
        group = groupRepository.save(group);

        Group finalGroup = group;
        GroupMember finalGroupMember = groupMember;
        groupCreateDto.getProfileNames().forEach(s -> {
            var profileDto = new ProfileCreateDto();
            profileDto.setName(s);
            profileService.createProfile(finalGroup.getId(), profileDto, finalGroupMember);
        });

        ruleMoveService.createDefaultRuleMoves(group, season);
        ruleService.createDefaultRules(season, groupCreateDto.getSportPreset(), groupMember);

        return ServiceResponse.ok(groupMapper.groupToGroupDto(group));
    }

    public Optional<GroupDto> findGroupsByInviteCode(String inviteCode) {
        return groupRepository.findByInviteCode(inviteCode)
                .map(groupMapper::groupToGroupDto);
    }

    public GroupDto getGroupByIdWithStats(String id) {
        return withStats(getGroupById(id));
    }

    public GroupDto getGroupById(String id) {
        return groupRepository.findById(id)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);
    }

    @Transactional
    public GroupDto updateGroup(String id, GroupCreateDto groupCreateDto) {
        return groupRepository.findById(id)
                .map(existingGroup -> {
                    existingGroup.setName(groupCreateDto.getName());
                    var dto = groupMapper.groupToGroupDto(groupRepository.save(existingGroup));

                    if (dto == null) {
                        return null;
                    }

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_UPDATE, dto.getId(), dto));

                    return dto;
                })
                .orElse(null);
    }

    @Transactional
    public GroupDto unsetWallpaper(String groupId) {
        var group = groupRepository.findById(groupId).orElse(null);
        if (group == null) return null;

        group.setWallpaper(null);
        groupRepository.save(group);

        return groupMapper.groupToGroupDto(group);
    }

    @Transactional
    public AssetUploadResponse storeWallpaper(String groupId, @Nullable AssetCropDto assetCropDto) {
        var groupOptional = groupRepository.findById(groupId);

        if (groupOptional.isEmpty()) {
            return null;
        }

        var group = groupOptional.get();
        String oldWallpaperAssetId = null;

        if (group.getWallpaper() != null) {
            oldWallpaperAssetId = group.getWallpaper().getId();
        }

        var uploadResponse = assetService.storeAsset(AssetType.GROUP_WALLPAPER, assetCropDto);

        group.setWallpaper(uploadResponse);

        groupRepository.save(group);

        if (oldWallpaperAssetId != null) {
            assetService.deleteAsset(oldWallpaperAssetId);
        }

        return assetService.uploadAsset(uploadResponse);
    }

    private GroupDto withStats(@Nullable GroupDto groupDto) {
        if (groupDto == null) {
            return null;
        } else if (groupDto.getActiveSeasonId() == null) {
            return groupDto;
        }

        //TODO should this be num of all time matches?
        groupDto.setNumberOfMatches(matchRepository.countBySeasonId(groupDto.getActiveSeasonId()));
        groupDto.setNumberOfPlayers(playerRepository.countBySeasonId(groupDto.getActiveSeasonId()));
        groupDto.setNumberOfSeasons(seasonRepository.countByGroupId(groupDto.getId()));

        return groupDto;
    }
}