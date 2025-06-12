package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

import java.time.LocalTime;
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

        assertNotNull(group);
        assertNotNull(group.getId());
        assertNotNull(group.getName());
        assertEquals(name, group.getName());
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
        assertEquals(1, group.getActiveSeason().getSeasonSettings().getMinMatchesToQualify());
        assertEquals(1, group.getActiveSeason().getSeasonSettings().getMinTeamSize());
        assertEquals(10, group.getActiveSeason().getSeasonSettings().getMaxTeamSize());
        assertEquals(RankingAlgorithm.AVERAGE, group.getActiveSeason().getSeasonSettings().getRankingAlgorithm());
        assertEquals(DailyLeaderboard.WAKE_TIME, group.getActiveSeason().getSeasonSettings().getDailyLeaderboard());
        assertEquals(LocalTime.of(0, 0), group.getActiveSeason().getSeasonSettings().getWakeTime());
        assertEquals(group.getCreatedBy(), group.getActiveSeason().getCreatedBy());

        group = testUtils.createTestGroup(port, "test", List.of("player1", "player2"), null, "test123");

        assertNotNull(group);
        assertEquals("test123", group.getCustomSportName());
        assertNull(group.getSportPreset());
    }

    @Test
    @Transactional
    public void group_create_invalidName() {
        var response = testUtils.postGroup(port, "", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        response = testUtils.postGroup(port, null, List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        response = testUtils.postGroup(port, "a", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);

        response = testUtils.postGroup(port, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", List.of("player1", "player2"), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_create_invalidProfiles() {
        var response = testUtils.postGroup(port, "test", List.of(), "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);

        response = testUtils.postGroup(port, "test", null, "beerpong");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_PROFILE_NAMES);
    }

    @Test
    @Transactional
    public void group_create_invalidSport() {
        var response = testUtils.postGroup(port, "test", List.of("player1", "player2"), "notExisting");
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

        response = testUtils.postGroup(port, "test", List.of("player1", "player2"), null);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_SPORT);

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

        assertFalse(groups.isEmpty());
        assertTrue(groups.stream().anyMatch(groupDto -> groupDto.getId().equals(prerequisiteGroup.getId())));
    }

    @Test
    @Transactional
    public void group_findByInviteCode_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), GroupDto.class);
        var group = requestUtils.assertSuccess(response, GroupDto.class);

        assertNotNull(group);
        testUtils.assertGroupEquals(prerequisiteGroup, group);
    }

    @Test
    @Transactional
    public void group_findByInviteCode_invalidInviteCode() {
        var response = requestUtils.performGet(port, "/groups?inviteCode= ", GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_INVITE_CODE);

        response = requestUtils.performGet(port, "/groups?inviteCode=someIdThatNotExists", GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.GROUP_INVITE_NOT_FOUND);
    }

    @Test
    @Transactional
    public void group_findById_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId(), GroupDto.class);
        var group = requestUtils.assertSuccess(response, GroupDto.class);

        assertNotNull(group);
        testUtils.assertGroupEquals(prerequisiteGroup, group);
    }

    @Test
    public void group_findById_invalidId() {
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

        assertNotNull(prerequisiteGroup);
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

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId(), createDto, GroupDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_GROUP_NAME);
    }

    @Test
    @Transactional
    public void group_join_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.GROUP_ALREADY_IN_GROUP);

        requestUtils.resetAuthForNextRequest();

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/join", null, String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK", ok);
    }

    @Test
    @Transactional
    public void group_leave() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/leave", null, String.class);
        var ok = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK", ok);
    }
}