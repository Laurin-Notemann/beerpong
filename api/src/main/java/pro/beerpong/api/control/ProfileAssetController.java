package pro.beerpong.api.control;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ProfileAssetMetadataDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.service.ProfileService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

@RestController
@RequestMapping("/groups/{groupId}/profiles/{profileId}")
@RequiredArgsConstructor
public class ProfileAssetController {
    private final GroupService groupService;
    private final ProfileService profileService;
    private final SubscriptionHandler subscriptionHandler;

    @PutMapping("/avatar")
    public ResponseEntity<ResponseEnvelope<ProfileAssetMetadataDto>> setAvatar(@PathVariable String groupId, @PathVariable String profileId, HttpServletRequest request, @RequestBody byte[] content) {
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }

        var profile = profileService.getProfileById(profileId);

        if (profile == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.PROFILE_NOT_FOUND);
        }

        var dto = new ProfileAssetMetadataDto(profileService.storeProfilePicture(profile, content, request.getContentType()), profileId);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PROFILE_AVATAR_SET, groupId, dto));

        return ResponseEnvelope.ok(dto);
    }
}