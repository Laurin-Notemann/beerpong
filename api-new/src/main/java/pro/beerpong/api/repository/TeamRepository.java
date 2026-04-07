package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.Team;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, String> {
    List<Team> findByMatchId(String matchId);

    List<Team> findByMatchIdIn(List<String> matchIds);

    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.photo WHERE t.match.id = :matchId")
    List<Team> findByMatchIdWithPhoto(@Param("matchId") String matchId);

    @Query("SELECT t.photo.id FROM Team t WHERE t.match.id = :matchId AND t.photo IS NOT NULL")
    List<String> findAssetIdsByMatch(@Param("matchId") String matchId);

    @Modifying
    @Query("DELETE FROM Team t WHERE t.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") String matchId);

    Optional<Team> findByIdAndMatchId(String id, String matchId);

    boolean existsByIdAndMatchId(String id, String matchId);
}
