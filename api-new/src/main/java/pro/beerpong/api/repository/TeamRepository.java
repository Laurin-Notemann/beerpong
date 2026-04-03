package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.Team;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, String> {
    List<Team> findByMatchId(String matchId);

    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.photo WHERE t.match.id = :matchId")
    List<Team> findByMatchIdWithPhoto(@Param("matchId") String matchId);
}
