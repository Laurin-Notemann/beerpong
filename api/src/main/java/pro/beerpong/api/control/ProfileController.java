package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.service.AssetService;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.service.ProfileService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequestMapping("/groups/{groupId}/profiles")
@RequiredArgsConstructor
public class ProfileController {
    private final GroupService groupService;
    private final ProfileService profileService;
    private final AssetService assetService;
    private final SubscriptionHandler subscriptionHandler;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<ProfileCreatedDto>> createProfile(@PathVariable String groupId, @RequestBody ProfileCreateDto profileCreateDto) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            var dto = profileService.createPlayer(groupId, profileCreateDto);

            if (dto == null) {
                return ResponseEnvelope.notOk(ErrorCodes.PROFILE_ALREADY_EXISTS);
            }

            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_CREATE, groupId, dto));

            return ResponseEnvelope.ok(dto);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<ProfileDto>>> listAllProfiles(@PathVariable String groupId) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            return ResponseEnvelope.ok(profileService.listAllProfilesOfGroup(groupId));
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> getProfileById(@PathVariable String groupId, @PathVariable String id) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            var profile = profileService.getProfileById(id);

            if (profile != null) {
                return ResponseEnvelope.ok(profile);
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> updateProfile(@PathVariable String groupId, @PathVariable String id, @RequestBody ProfileCreateDto profileCreateDto) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            var updatedProfile = profileService.updateProfile(id, profileCreateDto);

            if (updatedProfile != null) {
                subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_UPDATE, groupId, updatedProfile));

                return ResponseEnvelope.ok(updatedProfile);
            } else {
                return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
            }
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> setAvatar(@PathVariable String groupId,
                                                                  @PathVariable String id,
                                                                  @RequestBody(required = false) AssetCropDto assetCropDto) {
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        var profile = profileService.getProfileById(id);

        if (profile == null) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
        }

        if (assetCropDto != null && !assetCropDto.validate()) {
            return ResponseEnvelope.notOk(ErrorCodes.ASSET_VALIDATION_FAILED);
        }

        var dto = profileService.storeProfilePicture(profile, assetCropDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_AVATAR_SET, groupId, dto));

        return ResponseEnvelope.ok(dto);
    }

    @DeleteMapping("{id}/avatar")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> deleteAvatar(@PathVariable String groupId, @PathVariable String id) {
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        var profile = profileService.getProfileById(id);

        if (profile == null) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_FOUND);
        }

        if (!profile.getGroupId().equals(groupId)) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_NOT_OF_GROUP);
        }

        var asset = profile.getAvatarAsset();

        if (asset == null) {
            return ResponseEnvelope.notOk(ErrorCodes.PROFILE_HAS_NO_AVATAR);
        }

        profile = profileService.deleteProfilePicture(profile);
        assetService.deleteAsset(asset.getId());

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