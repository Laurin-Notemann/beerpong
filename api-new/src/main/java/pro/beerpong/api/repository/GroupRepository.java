package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Group;

import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, String> {
    Optional<Group> findByInviteCode(String inviteCode);

    @Query("SELECT g FROM Group g LEFT JOIN FETCH g.activeSeason WHERE g.id = :id")
    Optional<Group> findByIdWithActiveSeason(@Param("id") String id);
}
