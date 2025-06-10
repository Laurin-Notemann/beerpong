package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;

import java.util.ArrayList;
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
    public void group_create_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var group = testUtils.assertSuccess(response, GroupDto.class);

        assertNotNull(group);
        assertNotNull(group.getId());
        assertNotNull(group.getName());
        assertEquals(createDto.getName(), group.getName());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getCreatedAt());
        assertNull(group.getWallpaperAsset());
        assertNull(group.getCustomSportName());
        assertEquals(GroupPresetsController.BEERPONG.getId(), group.getSportPreset().getId());

        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertNull(group.getActiveSeason().getName());
        assertNotNull(group.getActiveSeason().getStartDate());
        assertNull(group.getActiveSeason().getEndDate());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
        assertNotNull(group.getActiveSeason().getSeasonSettings());
        assertEquals(group.getCreatedBy(), group.getActiveSeason().getCreatedBy());

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setCustomSportName("test123");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        group = testUtils.assertSuccess(response, GroupDto.class);

        assertNotNull(group);
        assertEquals("test123", group.getCustomSportName());
        assertNull(group.getSportPreset());
    }

    @Test
    @Transactional
    public void group_create_invalidName() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("");
        createDto.setSportPreset("beerpong");

        var response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName(null);
        createDto.setSportPreset("beerpong");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("a");
        createDto.setSportPreset("beerpong");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        createDto.setSportPreset("beerpong");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_create_invalidProfiles() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of());
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(null);
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
    }

    @Test
    @Transactional
    public void group_create_invalidSport() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("notExisting");

        var response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

        createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setCustomSportName("    ");

        response = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void group_userGroups() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        var response = testUtils.performGet(port, "/groups/user", List.class, GroupDto.class);
        var groups = (List<GroupDto>) testUtils.assertSuccess(response, ArrayList.class);



        assertFalse(groups.isEmpty());
        assertTrue(groups.stream().anyMatch(groupDto -> groupDto.getId().equals(prerequisiteGroup.getId())));
    }

    @Test
    @Transactional
    public void group_findByInviteCode_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        var response = testUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), GroupDto.class);
        var group = testUtils.assertSuccess(response, GroupDto.class);

        // if this is not here, the startDate millis are rounded and this test fails
        group.getActiveSeason().setStartDate(prerequisiteGroup.getActiveSeason().getStartDate());
        group.setCreatedAt(prerequisiteGroup.getCreatedAt());

        assertNotNull(group);
        assertEquals(prerequisiteGroup, group);
    }

    @Test
    @Transactional
    public void group_findByInviteCode_invalidInviteCode() {
        var response = testUtils.performGet(port, "/groups?inviteCode= ", GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_INVITE_CODE);

        response = testUtils.performGet(port, "/groups?inviteCode=someIdThatNotExists", GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.GROUP_INVITE_NOT_FOUND);
    }

    @Test
    @Transactional
    public void group_findById_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        var response = testUtils.performGet(port, "/groups/" + prerequisiteGroup.getId(), GroupDto.class);
        var group = testUtils.assertSuccess(response, GroupDto.class);

        // if this is not here, the startDate millis are rounded and this test fails
        group.getActiveSeason().setStartDate(prerequisiteGroup.getActiveSeason().getStartDate());
        group.setCreatedAt(prerequisiteGroup.getCreatedAt());

        assertNotNull(group);
        assertEquals(prerequisiteGroup, group);
    }

    @Test
    public void group_findById_invalidId() {
        var response = testUtils.performGet(port, "/groups/someIdThatNotExists", GroupDto.class);
        testUtils.assertFailure(response, HttpStatus.UNAUTHORIZED, "No access to this group!");
    }

    @Test
    @Transactional
    public void group_update_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        createDto.setName("test123");
        createDto.setCustomSportName("beerpong");
        createDto.setProfileNames(List.of());

        var response = testUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        var group = testUtils.assertSuccess(response, GroupDto.class);

        // if this is not here, the startDate millis are rounded and this test fails
        group.getActiveSeason().setStartDate(prerequisiteGroup.getActiveSeason().getStartDate());
        group.setCreatedAt(prerequisiteGroup.getCreatedAt());

        assertNotNull(prerequisiteGroup);
        assertNotNull(group);
        assertEquals(prerequisiteGroup.getId(), group.getId());
        assertEquals(createDto.getName(), group.getName());
        assertEquals(prerequisiteGroup.getInviteCode(), group.getInviteCode());
        assertEquals(prerequisiteGroup.getCreatedAt(), group.getCreatedAt());
        assertEquals(prerequisiteGroup.getWallpaperAsset(), group.getWallpaperAsset());
        assertEquals(prerequisiteGroup.getCustomSportName(), group.getCustomSportName());
        assertEquals(prerequisiteGroup.getSportPreset(), group.getSportPreset());
        assertEquals(prerequisiteGroup.getActiveSeason(), group.getActiveSeason());
    }

    @Test
    public void group_update_invalidName() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test123");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        createDto.setName("  ");

        var response = testUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        testUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_join_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        var response = testUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        testUtils.assertFailure(response, ErrorCodes.GROUP_ALREADY_IN_GROUP);

        testUtils.resetAuthForNextRequest();

        response = testUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        var ok = testUtils.assertSuccess(response, String.class);

        assertEquals("OK", ok);
    }

    @Test
    @Transactional
    public void group_leave() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var prerequisiteGroup = testUtils.assertSuccess(prerequisiteResponse, GroupDto.class);

        var response = testUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/leave", null, String.class);
        var ok = testUtils.assertSuccess(response, String.class);

        assertEquals("OK", ok);
    }
}