package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Group;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, String> {
    Optional<Group> findByInviteCode(String inviteCode);
}
