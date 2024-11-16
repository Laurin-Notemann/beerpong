package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Group;

import java.util.List;

public interface GroupRepository extends JpaRepository<Group, String> {
    List<Group> findByInviteCode(String inviteCode);
}
