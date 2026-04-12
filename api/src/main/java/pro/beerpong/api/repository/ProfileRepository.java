package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Device;
import pro.beerpong.api.model.dao.Profile;

import java.util.List;
import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, String> {
    List<Profile> findByGroupId(String groupId);

    Optional<Profile> findByName(String name);

    @Query("SELECT p FROM Profile p JOIN FETCH p.avatar WHERE p.group.id = :groupId")
    List<Profile> findByGroupIdWithAvatar(@Param("groupId") String groupId);

    Optional<Profile> findByGroupIdAndName(String groupId, String name);

    boolean existsByIdAndGroupId(String id, String groupId);
}