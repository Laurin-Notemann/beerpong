package pro.beerpong.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import jakarta.transaction.Transactional;
import pro.beerpong.api.model.dto.GroupCreateDto;

@SpringBootTest
public class GroupServiceTest {

    @Autowired
    private GroupService groupService;

    @Test
    @Transactional
    public void test_createGroup() {
        var groupName = "junit";
        var createDto = new GroupCreateDto();
        createDto.setName(groupName);

        var group = groupService.createGroup(createDto);

        assertNotNull(group);
        assertNotNull(group.getName());
        assertNotNull(group.getId());
        assertNotNull(group.getInviteCode());
        assertNotNull(group.getGroupSettings());
        assertNotNull(group.getGroupSettings().getId());
        assertNotNull(group.getActiveSeason());
        assertNotNull(group.getActiveSeason().getId());

        assertEquals(group.getName(), groupName);
        assertEquals(group.getActiveSeason().getGroupId(), group.getId());
    }
}
