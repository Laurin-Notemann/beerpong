package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.mapping.ProfileMapper;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileCreatedDto;
import pro.beerpong.api.model.dto.ProfileDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.util.AssetType;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final AssetService assetService;
    private final ProfileRepository profileRepository;
    private final GroupRepository groupRepository;
    private final GroupMapper groupMapper;
    private final ProfileMapper profileMapper;
    private final PlayerService playerService;

    public ProfileCreatedDto createPlayer(String groupId, ProfileCreateDto dto) {
        var existing = this.getProfileByName(groupId, dto.getName());

        if (existing != null) {
            var groupOptional = groupRepository.findById(groupId);

            if (groupOptional.isEmpty() || !existing.getGroupId().equals(groupId)) {
                return null;
            }

            var group = groupOptional.get();
            var season = group.getActiveSeason();

            if (season == null) {
                return null;
            }

            var existingPlayer = playerService.getBySeasonId(season.getId(), true).stream()
                    .filter(playerDto -> playerDto.getProfile().getId().equals(existing.getId()))
                    .findFirst();

            if (existingPlayer.isPresent()) {
                boolean success = playerService.reactivatePlayer(existingPlayer.get());

                if (!success) {
                    return null;
                }

                return new ProfileCreatedDto(existing, true, season.getId());
            } else {
                var lastPlayer = playerService.findLatestPlayer(existing.getId());

                playerService.createPlayer(season, profileMapper.profileDtoToProfile(existing), lastPlayer);

                return new ProfileCreatedDto(existing, false, (lastPlayer != null ? lastPlayer.getSeason().getId() : null));
            }
        } else {
            return new ProfileCreatedDto(this.createProfile(groupId, dto), false, null);
        }
    }

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto) {
        return this.createProfile(groupId, profileCreateDto, true);
    }

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto, boolean createPlayer) {
        var groupOptional = groupRepository.findById(groupId);

        var profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);
        profile.setGroup(groupOptional.orElseThrow());

        var savedProfile = profileRepository.save(profile);

        if (createPlayer) {
            playerService.createPlayer(savedProfile.getGroup().getActiveSeason(), savedProfile, null);
        }

        return profileMapper.profileToProfileDto(savedProfile);
    }

    public List<ProfileDto> listAllProfilesOfGroup(String groupId) {
        return profileRepository.findAllByGroupId(groupId)
                .stream()
                .map(profileMapper::profileToProfileDto)
                .collect(Collectors.toList());
    }

    public List<ProfileDto> listAllProfiles() {
        return profileRepository.findAll()
                .stream()
                .map(profileMapper::profileToProfileDto)
                .collect(Collectors.toList());
    }

    public ProfileDto getProfileById(String id) {
        return profileRepository.findById(id)
                .map(profileMapper::profileToProfileDto)
                .orElse(null);
    }

    public Profile getRawProfileById(String id) {
        return profileRepository.findById(id).orElse(null);
    }

    public ProfileDto getProfileByName(String groupId, String name) {
        return listAllProfilesOfGroup(groupId).stream()
                .filter(profileDto -> profileDto.getName().equals(name))
                .findFirst()
                .orElse(null);
    }

    public boolean deleteProfile(String id) {
        if (profileRepository.existsById(id)) {
            profileRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public ProfileDto updateProfile(String id, ProfileCreateDto profileCreateDto) {
        var profile = getRawProfileById(id);

        if (profile == null) {
            return null;
        }

        profile.setName(profileCreateDto.getName());

        return profileMapper.profileToProfileDto(profileRepository.save(profile));
    }

    public ProfileDto deleteProfilePicture(ProfileDto profileDto) {
        profileDto.setAvatarAsset(null);
        profileRepository.save(profileMapper.profileDtoToProfile(profileDto));

        return profileDto;
    }

    @Transactional
    public ProfileDto storeProfilePicture(ProfileDto profileDto) {
        String oldProfilePictureAssetId = null;

        if (profileDto.getAvatarAsset() != null) {
            oldProfilePictureAssetId = profileDto.getAvatarAsset().getId();
        }

        var assetMetadataDto = assetService.storeAsset(AssetType.PROFILE_AVATAR);

        profileDto.setAvatarAsset(assetMetadataDto);

        profileRepository.save(profileMapper.profileDtoToProfile(profileDto));

        if (oldProfilePictureAssetId != null) {
            assetService.deleteAsset(oldProfilePictureAssetId);
        }

        return profileDto;
    }
}
