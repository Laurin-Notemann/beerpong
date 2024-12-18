package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

import static pro.beerpong.api.util.RandomStringGenerator.generateRandomString;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final AssetService assetService;
    private final SubscriptionHandler subscriptionHandler;
    private final GroupRepository groupRepository;
    private final SeasonRepository seasonRepository;
    private final ProfileService profileService;
    private final GroupMapper groupMapper;
    private final MatchRepository matchRepository;
    private final PlayerService playerService;
    private final RuleMoveService ruleMoveService;

    public GroupDto createGroup(GroupCreateDto groupCreateDto) {
        Group group = groupMapper.groupCreateDtoToGroup(groupCreateDto);
        group.setInviteCode(generateRandomString(9));

        var season = new Season();
        season.setStartDate(ZonedDateTime.now());
        season.setSeasonSettings(new SeasonSettings());

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

        ruleMoveService.createDefaultRuleMoves(season);

        return groupMapper.groupToGroupDto(group);
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
        var groupDto = groupRepository.findById(id)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);

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

    public GroupDto getRawGroupById(String id) {
        return groupRepository.findById(id)
                .map(groupMapper::groupToGroupDto)
                .orElse(null);
    }

    public GroupDto updateGroup(String id, GroupCreateDto groupCreateDto) {
        return groupRepository.findById(id)
                .map(existingGroup -> {
                    existingGroup.setName(groupCreateDto.getName());
                    var dto = groupMapper.groupToGroupDto(groupRepository.save(existingGroup));

                    if (dto == null) {
                        return null;
                    }

                    if (dto.getActiveSeason() != null) {
                        dto.setNumberOfMatches(matchRepository.findBySeasonId(dto.getActiveSeason().getId()).size());
                        dto.setNumberOfPlayers(playerService.getBySeasonId(dto.getActiveSeason().getId()).size());
                        dto.setNumberOfSeasons(seasonRepository.findByGroupId(dto.getId()).size());
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
}