package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.ErrorCodes;
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
    public void whenPassingGroupInviteCodeToFindGroupByInviteCode_ThenIsSuccessful() {
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

        var response = testUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), GroupDto.class);

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
        assertNotNull(group.getName());
        assertEquals(prerequisiteGroup, group);
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
        assertEquals(group.getSportPreset(), prerequisiteGroup.getSportPreset());
    }
}