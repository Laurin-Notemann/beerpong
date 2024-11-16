package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.GroupCreateDto;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class GroupServiceTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    public void test_createGroup() {
        var groupName = "junit";
        var createDto = new GroupCreateDto();
        createDto.setName(groupName);

        var response = testUtils.performPost(port, "/groups", createDto, new ParameterizedTypeReference<ResponseEnvelope<GroupDto>>() {});

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        var envelope = response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var group = envelope.getData();

        assertNotNull(group);
        assertNotNull(group.getName());
        assertEquals(groupName, group.getName());
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getGroupSettings());
        assertNotNull(group.getGroupSettings().getId());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
    }
}
