package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.AuthService;
import pro.beerpong.api.service.GroupService;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class GroupController {
    public static final String USER_GROUPS_ENDPOINT = "user";

    private final GroupService groupService;
    private final AuthService authService;

    @Autowired
    public GroupController(GroupService groupService, AuthService authService) {
        this.groupService = groupService;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<GroupDto>> createGroup(@RequestBody GroupCreateDto groupCreateDto) {
        if (groupCreateDto.invalidName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_NAME);
        }

        if (groupCreateDto.invalidProfileName()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
        }

        var group = groupService.createGroup(groupCreateDto);

        if (group == null) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_SPORT);
        }

        return ResponseEnvelope.ok(group);
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

    @PostMapping("/{id}/leave-group")
    public ResponseEntity<ResponseEnvelope<String>> leaveGroup(@PathVariable String id, @AuthenticationPrincipal UserDto user) {
        if (user == null) {
            return ResponseEnvelope.notOk(ErrorCodes.AUTH_INVALID_USER);
        }

        if (id == null || id.trim().isEmpty()) {
            return ResponseEnvelope.notOk(ErrorCodes.INVALID_GROUP_ID);
        }

        authService.leaveGroup(user, id);

        return ResponseEnvelope.ok("OK");
    }
}
