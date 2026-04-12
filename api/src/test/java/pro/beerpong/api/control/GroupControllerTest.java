package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dto.groups.GroupCreateDto;
import pro.beerpong.api.model.dto.groups.GroupDto;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class GroupControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    public void group_create_success() {
        var name = "test";
        var group = testUtils.createTestGroup(port, name);

        // test simple group creation
        assertNotNull(group);
        assertNotNull(group.getId());
        assertNotNull(group.getName());
        assertEquals(name, group.getName());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getCreatedAt());
        assertNull(group.getAssetIdWallpaper());
        assertNull(group.getCustomSportName());
        assertEquals(GroupPresetsController.BEERPONG.getId(), group.getSportPreset().getId());
        assertNotNull(group.getActiveSeasonId());

        group = testUtils.createTestGroup(port, "test", List.of("player1", "player2"), null, "test123");

        // test group creation with custom sport name
        assertNotNull(group);
        assertEquals("test123", group.getCustomSportName());
        assertNull(group.getSportPreset());

        group = testUtils.createTestGroup(port, "test", List.of("player1", "player2"), "kicker", "test123");

        // test group creation with other game preset
        assertNotNull(group);
        assertNull(group.getCustomSportName());
        assertEquals(GroupPresetsController.KICKER.getId(), group.getSportPreset().getId());
    }

    @Test
    @Transactional
    public void group_create_invalidName() {
        // test invalid group name (empty)
        var response = testUtils.postGroup(port, "", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        // test invalid group name (null)
        response = testUtils.postGroup(port, null, List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        // test invalid group name (too short)
        response = testUtils.postGroup(port, "a", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        // test invalid group name (too long)
        response = testUtils.postGroup(port, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_create_invalidProfiles() {
        // test invalid profile names (empty)
        var response = testUtils.postGroup(port, "test", List.of(), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);

        // test invalid profile names (null)
        response = testUtils.postGroup(port, "test", null, "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);

        // test invalid profile names (non unique names)
        response = testUtils.postGroup(port, "test", List.of("player1", "player2", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
    }

    @Test
    @Transactional
    public void group_create_invalidSport() {
        // test invalid sport (non existing preset)
        var response = testUtils.postGroup(port, "test", List.of("player1", "player2"), "notExisting");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

        // test invalid sport (preset null)
        response = testUtils.postGroup(port, "test", List.of("player1", "player2"), null);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

        // test invalid sport (custom sport empty)
        response = testUtils.postGroup(port, "test", List.of("player1", "player2"), null, "      ");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void group_userGroups() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/user", List.class, GroupDto.class);
        var groups = (List<GroupDto>) requestUtils.assertSuccess(response, ArrayList.class);

        // test groups a user has access to
        assertFalse(groups.isEmpty());
        assertTrue(groups.stream().anyMatch(groupDto -> groupDto.getId().equals(prerequisiteGroup.getId())));
    }

    @Test
    @Transactional
    public void group_findByInviteCode_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), GroupDto.class);
        var group = requestUtils.assertSuccess(response, GroupDto.class);

        // test group by invite code
        assertNotNull(group);
        testUtils.assertGroupEquals(prerequisiteGroup, group);
    }

    @Test
    @Transactional
    public void group_findByInviteCode_invalidInviteCode() {
        // test invalid inviteCode (empty)
        var response = requestUtils.performGet(port, "/groups?inviteCode= ", GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_INVITE_CODE);

        // test invalid inviteCode (not existing)
        response = requestUtils.performGet(port, "/groups?inviteCode=someIdThatNotExists", GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.GROUP_INVITE_NOT_FOUND);
    }

    @Test
    @Transactional
    public void group_findById_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId(), GroupDto.class);
        var group = requestUtils.assertSuccess(response, GroupDto.class);

        // test group by id
        assertNotNull(group);
        testUtils.assertGroupEquals(prerequisiteGroup, group);
    }

    @Test
    public void group_findById_invalidId() {
        // test invalid group id (not existing)
        var response = requestUtils.performGet(port, "/groups/someIdThatNotExists", GroupDto.class);
        requestUtils.assertFailure(response, HttpStatus.UNAUTHORIZED, "No access to this group!");
    }

    @Test
    @Transactional
    public void group_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var createDto = new GroupCreateDto();
        createDto.setName("test123");
        createDto.setCustomSportName("kicker");
        createDto.setProfileNames(List.of("player3", "player4", "player1"));

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        var group = requestUtils.assertSuccess(response, GroupDto.class);

        // test group update
        assertNotNull(prerequisiteGroup);
        assertNotNull(group);
        assertEquals(prerequisiteGroup.getId(), group.getId());
        assertEquals(createDto.getName(), group.getName());
        assertEquals(prerequisiteGroup.getInviteCode(), group.getInviteCode());
        assertEquals(prerequisiteGroup.getCreatedById(), group.getCreatedById());
        assertEquals(prerequisiteGroup.getAssetIdWallpaper(), group.getAssetIdWallpaper());
        assertEquals(prerequisiteGroup.getCustomSportName(), group.getCustomSportName());
        assertEquals(prerequisiteGroup.getSportPreset(), group.getSportPreset());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), group.getActiveSeasonId());
    }

    @Test
    public void group_update_invalidName() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var createDto = new GroupCreateDto();
        createDto.setName("  ");

        // test invalid group name (empty)
        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto.setName(null);

        // test invalid group name (null)
        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto.setName("a");

        // test invalid group name (too short)
        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto.setName("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        // test invalid group name (too long)
        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_join_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        // test group join (already in group)
        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.GROUP_ALREADY_IN_GROUP);

        requestUtils.resetAuthForNextRequest();

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        // test group join (not in group)
        assertEquals("OK", ok);
    }

    @Test
    @Transactional
    public void group_leave() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/leave", null, String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        // test group leave
        assertEquals("OK", ok);
    }
}