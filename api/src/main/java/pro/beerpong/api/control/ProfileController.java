package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
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
    private final SubscriptionHandler subscriptionHandler;

    @PostMapping
    public ResponseEntity<ResponseEnvelope<ProfileDto>> createProfile(@PathVariable String groupId, @RequestBody ProfileCreateDto profileCreateDto) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            var dto = profileService.createProfile(groupId, profileCreateDto);

            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_CREATE, groupId, dto));

            return ResponseEnvelope.ok(dto);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<ProfileDto>>> listAllProfiles(@PathVariable String groupId) {
        var group = groupService.getGroupById(groupId);

        if (group != null) {
            return ResponseEnvelope.ok(profileService.listAllProfilesOfGroup(groupId));
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
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
                return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.PROFILE_NOT_FOUND);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
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
                return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.PROFILE_NOT_FOUND);
            }
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }
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
//                return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.PROFILE_NOT_FOUND);
//            }
//        } else {
//            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
//        }
//    }
}