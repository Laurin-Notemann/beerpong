package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.Group;

public interface GroupRepository extends JpaRepository<Group, String> {
}
