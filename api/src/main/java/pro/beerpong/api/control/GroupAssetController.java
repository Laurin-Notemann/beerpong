package pro.beerpong.api.control;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.GroupService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

@RestController
@RequestMapping("/groups/{groupId}")
@RequiredArgsConstructor
public class GroupAssetController {
    private final GroupService groupService;
    private final SubscriptionHandler subscriptionHandler;

    @PutMapping("/wallpaper")
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> setWallpaper(@PathVariable String groupId, HttpServletRequest request, @RequestBody byte[] content) {
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }

        var dto = groupService.storeWallpaper(group, content, request.getContentType());

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.GROUP_WALLPAPER_SET, groupId, dto));

        return ResponseEnvelope.ok(dto);
    }
}