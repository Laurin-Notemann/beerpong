package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.AssetService;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

@RestController
@RequestMapping("/groups")
public class GroupController {
    private final GroupService groupService;
    private final AssetService assetService;
    private final SubscriptionHandler subscriptionHandler;

    @Autowired
    public GroupController(GroupService groupService, AssetService assetService, SubscriptionHandler subscriptionHandler) {
        this.groupService = groupService;
        this.assetService = assetService;
        this.subscriptionHandler = subscriptionHandler;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> createGroup(@RequestBody GroupCreateDto groupCreateDto) {
        if (groupCreateDto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_NAME);
        }

        if (groupCreateDto.invalidProfileName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
        }

        return ResponseEnvelope.ok(groupService.createGroup(groupCreateDto));
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> findGroupByInviteCode(@RequestParam String inviteCode) {
        if (inviteCode == null || inviteCode.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_INVITE_CODE);
        }

        var group = groupService.findGroupsByInviteCode(inviteCode);

        if (group != null) {
            return ResponseEnvelope.ok(group);
        } else {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_INVITE_NOT_FOUND);
        }
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
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> setWallpaper(@PathVariable String id) {
        var group = groupService.getGroupById(id);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        var dto = groupService.storeWallpaper(group);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_WALLPAPER_SET, id, dto));

        return ResponseEnvelope.ok(dto);
    }

    @DeleteMapping("{id}/wallpaper")
    public ResponseEntity<ResponseEnvelope<GroupDto>> deleteWallpaper(@PathVariable String id) {
        var group = groupService.getGroupById(id);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        }

        var asset = group.getWallpaperAsset();

        if (asset == null) {
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_HAS_NO_WALLPAPER);
        }

        group = groupService.deleteWallpaper(group);
        assetService.deleteAsset(asset.getId());

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_WALLPAPER_DELETE, id, group));

        return ResponseEnvelope.ok(group);
    }
}
