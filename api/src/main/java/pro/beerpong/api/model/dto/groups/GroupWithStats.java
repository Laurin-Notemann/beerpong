package pro.beerpong.api.model.dto.groups;

import pro.beerpong.api.model.dao.Group;

public record GroupWithStats(Group group, long matches, long players, long seasons) {
}
