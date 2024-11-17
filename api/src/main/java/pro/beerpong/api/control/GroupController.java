package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.GroupService;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class GroupController {

    private final GroupService groupService;

    @Autowired
    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> createGroup(@RequestBody GroupCreateDto groupCreateDto) {
        GroupDto savedGroup = groupService.createGroup(groupCreateDto);
        return ResponseEnvelope.ok(savedGroup);
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> findGroupByInviteCode(@RequestParam String inviteCode) {
        if (inviteCode == null || inviteCode.trim().isEmpty()) {
            return ResponseEnvelope.notOk(HttpStatus.BAD_REQUEST, ErrorCodes.GROUP_INVITE_CODE_NOT_PROVIDED);
        }

        var group = groupService.findGroupsByInviteCode(inviteCode);

        if (group != null) {
            return ResponseEnvelope.ok(group);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_INVITE_NOT_FOUND);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<GroupDto>> getGroupById(@PathVariable String id) {
        GroupDto group = groupService.getGroupById(id);
        if (group != null) {
            return ResponseEnvelope.ok(group);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<GroupDto>> updateGroup(
            @PathVariable String id, @RequestBody GroupCreateDto groupCreateDto) {
        GroupDto updatedGroup = groupService.updateGroup(id, groupCreateDto);
        if (updatedGroup != null) {
            return ResponseEnvelope.ok(updatedGroup);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        }
    }
}
