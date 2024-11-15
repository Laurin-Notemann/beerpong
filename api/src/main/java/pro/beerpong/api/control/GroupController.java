package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.Group;
import pro.beerpong.api.repository.GroupRepository;

import java.util.UUID;

@RestController
@RequestMapping("/groups")
public class GroupController {

    private final GroupRepository groupRepository;

    @Autowired
    public GroupController(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    // Endpoint zum Erstellen einer neuen Gruppe
    @PostMapping
    public ResponseEntity<Group> createGroup(@RequestBody Group group) {
        // UUID als String generieren, falls noch nicht gesetzt
        if (group.getId() == null || group.getId().isEmpty()) {
            group.setId(UUID.randomUUID().toString());
        }
        Group savedGroup = groupRepository.save(group);
        return ResponseEntity.ok(savedGroup);
    }
}
