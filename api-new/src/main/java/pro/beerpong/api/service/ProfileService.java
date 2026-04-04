package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pro.beerpong.api.mapping.GroupMapper;
import pro.beerpong.api.mapping.ProfileMapper;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.assets.AssetCropDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.profile.ProfileCreateDto;
import pro.beerpong.api.model.dto.profile.ProfileCreatedDto;
import pro.beerpong.api.model.dto.profile.ProfileDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.util.AssetType;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final ProfileRepository profileRepository;
    private final GroupRepository groupRepository;

    private final ProfileMapper profileMapper;

    private final AuthService authService;
    private final AssetService assetService;
    private final PlayerService playerService;
    private final PlayerRepository playerRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final SeasonRepository seasonRepository;

    public ServiceResponse<ProfileCreatedDto> createPlayer(String groupId, ProfileCreateDto dto, UserDto user) {
        var profileOptional = profileRepository.findByGroupIdAndName(groupId, dto.getName());

        if (profileOptional.isPresent()) {
            var existing = profileOptional.get();
            var season = seasonRepository.findActiveSeasonByGroupId(groupId).orElseThrow();

            var existingPlayerId = playerRepository.findByProfileIdAndSeasonId(existing.getId(), season.getId())
                    .map(Player::getId);

            if (existingPlayerId.isPresent()) {
                var res = playerService.reactivatePlayer(existingPlayerId.get());

                if (res.isError()) {
                    return ServiceResponse.error(res.getErrorCode());
                }

                return ServiceResponse.ok(new ProfileCreatedDto(
                        profileMapper.profileToProfileDto(existing),
                        true,
                        season.getId()
                ));
            } else {
                var lastPlayer = playerService.findLatestPlayer(existing.getId());

                lastPlayer.ifPresent(player -> playerService.createPlayer(season, existing, player));

                return ServiceResponse.ok(new ProfileCreatedDto(
                        profileMapper.profileToProfileDto(existing),
                        false,
                        (lastPlayer.isPresent() ? lastPlayer.get().getSeason().getId() : null)
                ));
            }
        } else {
            return ServiceResponse.ok(new ProfileCreatedDto(
                    this.createProfile(groupId, dto, authService.getMemberInGroup(user.getId(), groupId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN))),
                    false,
                    null
            ));
        }
    }

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto, GroupMember groupMember) {
        return this.createProfile(groupId, profileCreateDto, true, groupMember.getId());
    }

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto, boolean createPlayer, String groupMemberId) {
        var profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);

        profile.setGroup(groupRepository.getReferenceById(groupId));
        profile.setCreatedBy(groupMemberRepository.getReferenceById(groupMemberId));

        var savedProfile = profileRepository.save(profile);

        if (createPlayer) {
            seasonRepository.findById(savedProfile.getGroup().getId()).ifPresent(season ->
                    playerService.createPlayer(
                            season,
                            savedProfile,
                            null
                    ));
        }

        return profileMapper.profileToProfileDto(savedProfile);
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

    public boolean deleteProfile(String id) {
        if (profileRepository.existsById(id)) {
            profileRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public ServiceResponse<ProfileDto> updateProfile(String profileId, String groupId, ProfileCreateDto profileCreateDto) {
        var profileOptional = profileRepository.findById(profileId);

        if (profileOptional.isEmpty()) {
            return ServiceResponse.error(ErrorCodes.PROFILE_NOT_FOUND);
        }

        var profile = profileOptional.get();

        if (!profile.getGroup().getId().equals(groupId)) {
            return ServiceResponse.error(ErrorCodes.PROFILE_NOT_OF_GROUP);
        }

        profile.setName(profileCreateDto.getName());

        return ServiceResponse.ok(profileMapper.profileToProfileDto(profileRepository.save(profile)));
    }

    public ProfileDto deleteProfilePicture(String profileId) {
        var profile = profileRepository.findById(profileId);

        if (profile.isEmpty()) {
            return null;
        }

        profile.get().setAvatar(null);

        profileRepository.save(profile.get());

        return profileMapper.profileToProfileDto(profile.get());
    }

    @Transactional
    public AssetUploadResponse storeProfilePicture(String profileId, @Nullable AssetCropDto assetCropDto) {
        var profileOptional = profileRepository.findById(profileId);

        if (profileOptional.isEmpty()) {
            return null;
        }

        var profile = profileOptional.get();
        String oldProfilePictureAssetId = null;

        if (profile.getAvatar() != null) {
            oldProfilePictureAssetId = profile.getAvatar().getId();
        }

        var avatarAsset = assetService.storeAsset(AssetType.PROFILE_AVATAR, assetCropDto);

        profile.setAvatar(avatarAsset);
        profileRepository.save(profile);

        if (oldProfilePictureAssetId != null) {
            assetService.deleteAsset(oldProfilePictureAssetId);
        }

        return assetService.uploadAsset(avatarAsset);
    }
}
