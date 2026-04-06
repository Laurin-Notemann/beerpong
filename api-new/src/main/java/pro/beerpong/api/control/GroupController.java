package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.assets.AssetCropDto;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
import pro.beerpong.api.model.dto.groups.GroupCreateDto;
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.service.AssetService;
import pro.beerpong.api.service.AuthService;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class GroupController {
    public static final String USER_GROUPS_ENDPOINT = "user";
    public static final String JOIN_GROUP_ENDPOINT = "join";

    private final GroupService groupService;
    private final AssetService assetService;
    private final SubscriptionHandler subscriptionHandler;
    private final AuthService authService;

    @Autowired
    public GroupController(GroupService groupService, AssetService assetService, SubscriptionHandler subscriptionHandler, AuthService authService) {
        this.groupService = groupService;
        this.assetService = assetService;
        this.subscriptionHandler = subscriptionHandler;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> createGroup(@RequestBody GroupCreateDto groupCreateDto,
                                                                  @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (groupCreateDto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_NAME);
        }

        if (groupCreateDto.invalidProfileName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
        }

        var group = groupService.createGroup(groupCreateDto, user);

        if (group.isError()) {
            return ResponseEnvelope.notOk(group.getErrorCode());
        }

        return ResponseEnvelope.ok(group.getData());
    }

    @GetMapping(USER_GROUPS_ENDPOINT)
    public ResponseEntity<ResponseEnvelope<List<GroupDto>>> findUserGroups(@AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        var groups = groupService.findGroupsByUser(user);

        return ResponseEnvelope.ok(groups);
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> findGroupByInviteCode(@RequestParam String inviteCode) {
        if (inviteCode == null || inviteCode.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_INVITE_CODE);
        }

        return groupService.findGroupsByInviteCode(inviteCode)
                .map(ResponseEnvelope::ok)
                .orElseGet(() -> ResponseEnvelope.notOk(ErrorCodes.GROUP_INVITE_NOT_FOUND));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<GroupDto>> getGroupById(@PathVariable String id) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        GroupDto group = groupService.getGroupById(id);
        if (group != null) {
            return ResponseEnvelope.ok(group);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<GroupDto>> updateGroup(@PathVariable String id,
                                                                  @RequestBody GroupCreateDto groupCreateDto) {
        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (groupCreateDto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_NAME);
        }

        GroupDto updatedGroup = groupService.updateGroup(id, groupCreateDto);
        if (updatedGroup != null) {
            return ResponseEnvelope.ok(updatedGroup);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}/wallpaper")
    public ResponseEntity<ResponseEnvelope<AssetUploadResponse>> setWallpaper(@PathVariable String id,
                                                                              @RequestBody(required = false) AssetCropDto assetCropDto) {
        var group = groupService.getGroupById(id);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        if (assetCropDto != null && !assetCropDto.validate()) {
            return ResponseEnvelope.notOk(ErrorCodes.ASSET_VALIDATION_FAILED);
        }

        var dto = groupService.storeWallpaper(group.getId(), assetCropDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_WALLPAPER_SET, id, dto));

        return ResponseEnvelope.ok(dto);
    }

    @DeleteMapping("{id}/wallpaper")
    public ResponseEntity<ResponseEnvelope<GroupDto>> deleteWallpaper(@PathVariable String id) {
        var group = groupService.getGroupById(id);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        var assetId = group.getAssetIdWallpaper();

        if (assetId == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_HAS_NO_WALLPAPER);
        }

        group = groupService.unsetWallpaper(group.getId());
        assetService.deleteAsset(assetId);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_WALLPAPER_DELETE, id, group));

        return ResponseEnvelope.ok(group);
    }

    @PostMapping("/{id}/" + JOIN_GROUP_ENDPOINT)
    public ResponseEntity<ResponseEnvelope<String>> joinGroup(@PathVariable String id, @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        var groupMember = authService.joinGroup(user, id);

        if (groupMember != null) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_ALREADY_IN_GROUP);
        }
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<ResponseEnvelope<String>> leaveGroup(@PathVariable String id, @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        if (authService.leaveGroup(user, id)) {
            return ResponseEnvelope.ok("OK");
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_USER_NOT_IN_GROUP);
        }
    }
}
