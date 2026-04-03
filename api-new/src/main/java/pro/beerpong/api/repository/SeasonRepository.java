package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Season;

import java.util.List;
import java.util.Optional;

public interface SeasonRepository extends JpaRepository<Season, String> {
    List<Season> findByGroupId(String groupId);

    @Query("SELECT s FROM Season s JOIN FETCH s.seasonSettings WHERE s.id = :id")
    Optional<Season> findByIdWithSettings(@Param("id") String id);
}
