package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.assets.AssetCropDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.profile.ProfileCreateDto;
import pro.beerpong.api.model.dto.profile.ProfileCreatedDto;
import pro.beerpong.api.model.dto.profile.ProfileDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.service.AssetService;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.service.ProfileService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/groups/{groupId}/profiles")
public class ProfileController {
    private final SubscriptionHandler subscriptionHandler;

    private final GroupRepository groupRepository;
    private final ProfileRepository profileRepository;

    private final ProfileService profileService;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<ProfileCreatedDto>> createProfile(@PathVariable String groupId,
                                                                             @RequestBody ProfileCreateDto profileCreateDto,
                                                                             @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (groupRepository.existsById(groupId)) {
            var dto = profileService.createPlayer(groupId, profileCreateDto, user);

            if (dto.isError()) {
                return ResponseEnvelope.notOk(dto.getErrorCode());
            }

            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_CREATE, groupId, dto.getData()));

            return ResponseEnvelope.ok(dto.getData());
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<ProfileDto>>> listAllProfiles(@PathVariable String groupId) {
        if (groupRepository.existsById(groupId)) {
            return ResponseEnvelope.ok(profileService.listAllProfiles(groupId));
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> getProfileById(@PathVariable String groupId, @PathVariable String id) {
        if (groupRepository.existsById(groupId)) {
            if (profileRepository.existsByIdAndGroupId(id, groupId)) {
                var profile = profileService.getProfileById(id);

                if (profile != null) {
                    if (profile.getGroupId().equals(groupId)) {
                        return ResponseEnvelope.ok(profile);
                    } else {
                        return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_OF_GROUP);
                    }
                } else {
                    return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
                }
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
            }

        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> updateProfile(@PathVariable String groupId, @PathVariable String id, @RequestBody ProfileCreateDto profileCreateDto) {
        if (groupRepository.existsById(groupId)) {
            var updatedProfile = profileService.updateProfile(id, groupId, profileCreateDto);

            if (updatedProfile.isOk()) {
                subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_UPDATE, groupId, updatedProfile.getData()));

                return ResponseEnvelope.ok(updatedProfile.getData());
            } else {
                return ResponseEnvelope.notOk(updatedProfile.getErrorCode());
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<ResponseEnvelope<AssetUploadResponse>> setAvatar(@PathVariable String groupId,
                                                                           @PathVariable String id,
                                                                           @RequestBody(required = false) AssetCropDto assetCropDto) {
        if (!groupRepository.existsById(groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        if (!profileRepository.existsByIdAndGroupId(id, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
        }

        if (assetCropDto != null && !assetCropDto.validate()) {
            return ResponseEnvelope.notOk(ErrorCodes.ASSET_VALIDATION_FAILED);
        }

        var dto = profileService.storeProfilePicture(id, assetCropDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_AVATAR_SET, groupId, dto));

        return ResponseEnvelope.ok(dto);
    }

    @DeleteMapping("{id}/avatar")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> deleteAvatar(@PathVariable String groupId, @PathVariable String id) {
        if (!groupRepository.existsById(groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        if (!profileRepository.existsByIdAndGroupId(id, groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
        }

        var profile = profileService.deleteProfilePicture(id);

        if (profile == null) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_HAS_NO_AVATAR);
        }

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_AVATAR_DELETE, id, profile));

        return ResponseEnvelope.ok(profile);
    }

// it is not intended to delete profiles!
//    @DeleteMapping("/{id}")
//    public ResponseEntity<ResponseEnvelope<String>> deleteProfile(@PathVariable String groupId, @PathVariable String id) {
//        var group = groupService.getGroupById(groupId);
//
//        if (group != null) {
//            if (profileService.deleteProfile(id)) {
//                return ResponseEnvelope.ok("OK");
//            } else {
//                return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
//            }
//        } else {
//            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
//        }
//    }
}