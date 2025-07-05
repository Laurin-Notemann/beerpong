package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class GroupControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void whenPassingValidGroupToCreatingGroup_ThenIsSuccessful() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ResponseEnvelope<GroupDto> envelope = (ResponseEnvelope<GroupDto>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var group = envelope.getData();

        assertNotNull(group);
        assertNotNull(group.getName());
        assertEquals(createDto.getName(), group.getName());
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
        assertEquals(GroupPresetsController.BEERPONG.getId(), group.getSportPreset().getId());
    }

    @Test
    @Transactional
    public void group_findByInviteCode_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(),
                GroupDto.class);
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
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);

        assertNotNull(prerequisiteResponse);
        assertEquals(200, prerequisiteResponse.getStatusCode().value());

        ResponseEnvelope<GroupDto> prerequisiteEnvelope = (ResponseEnvelope<GroupDto>) prerequisiteResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteGroup = prerequisiteEnvelope.getData();

        var response = testUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(),
                GroupDto.class);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ResponseEnvelope<GroupDto> envelope = (ResponseEnvelope<GroupDto>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var group = envelope.getData();

        // if this is not here, the startDate millis are rounded and this test fails
        group.getActiveSeason().setStartDate(prerequisiteGroup.getActiveSeason().getStartDate());
        group.setCreatedAt(prerequisiteGroup.getCreatedAt());

        assertNotNull(group);
        assertEquals(prerequisiteGroup.getId(), group.getId());
        assertEquals(createDto.getName(), group.getName());
        assertEquals(prerequisiteGroup.getInviteCode(), group.getInviteCode());
        assertEquals(prerequisiteGroup.getCreatedBy(), group.getCreatedBy());
        assertEquals(prerequisiteGroup.getWallpaperAsset(), group.getWallpaperAsset());
        assertEquals(prerequisiteGroup.getCustomSportName(), group.getCustomSportName());
        assertEquals(prerequisiteGroup.getSportPreset(), group.getSportPreset());
        testUtils.assertSeasonEquals(prerequisiteGroup.getActiveSeason(), group.getActiveSeason());
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
        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null,
                String.class);
        requestUtils.assertFailure(response, ErrorCodes.GROUP_ALREADY_IN_GROUP);

        requestUtils.resetAuthForNextRequest();

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        // test group join (not in group)
        assertEquals("OK", ok);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void group_leave() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/leave", null,
                String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        // test group leave
        assertEquals("OK", ok);
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
}