package pro.beerpong.api.control;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.GroupService;

@RestController
@RequestMapping("/groups/{groupId}")
@RequiredArgsConstructor
public class GroupAssetController {
    private final GroupService groupService;

    @PutMapping("/wallpaper")
    @Transactional
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> setWallpaper(@PathVariable String groupId, HttpServletRequest request, @RequestBody byte[] content) {
        var group = groupService.getGroupById(groupId);

        if (group == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }

        return ResponseEnvelope.ok(groupService.storeGroupWallpaper(group, content, request.getContentType()));
    }
}