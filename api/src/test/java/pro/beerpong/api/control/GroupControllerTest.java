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
        assertNotNull(group.getGroupSettings());
        assertNotNull(group.getGroupSettings().getId());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void whenPassingGroupInviteCodeToFindGroupByInviteCode_ThenIsSuccessful() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");

        var prerequisiteResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);

        assertNotNull(prerequisiteResponse);
        assertEquals(200, prerequisiteResponse.getStatusCode().value());

        ResponseEnvelope<GroupDto> prerequisiteEnvelope = (ResponseEnvelope<GroupDto>) prerequisiteResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteGroup = prerequisiteEnvelope.getData();

        var response = testUtils.performGet(port, "/groups?inviteCode=" + prerequisiteGroup.getInviteCode(), List.class, GroupDto.class);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        ResponseEnvelope<List<GroupDto>> envelope = (ResponseEnvelope<List<GroupDto>>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var groups = envelope.getData();

        assertNotNull(groups);
        assertEquals(1, groups.size());

        var group = groups.getFirst();

        assertNotNull(group.getName());
        assertEquals(prerequisiteGroup, group);
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getGroupSettings());
        assertNotNull(group.getGroupSettings().getId());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
    }
}