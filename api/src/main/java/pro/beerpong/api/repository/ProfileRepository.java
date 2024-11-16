package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Profile;

import java.util.List;

public interface ProfileRepository extends JpaRepository<Profile, String> {
    List<Profile> findAllByGroupId(String groupId);
}
