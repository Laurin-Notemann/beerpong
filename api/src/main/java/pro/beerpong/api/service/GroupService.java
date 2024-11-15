package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.Group;
import pro.beerpong.api.repository.GroupRepository;

import java.util.List;
import java.util.UUID;

@Service
public class GroupService {

    private final GroupRepository groupRepository;

    @Autowired
    public GroupService(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    public Group createGroup(Group group) {
        if (group.getId() == null || group.getId().isEmpty()) {
            group.setId(UUID.randomUUID().toString());
        }
        return groupRepository.save(group);
    }

    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    public Group getGroupById(String id) {
        return groupRepository.findById(id).orElse(null);
    }
}
