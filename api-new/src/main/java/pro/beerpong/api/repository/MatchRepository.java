package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.Player;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, String> {
    List<Match> findBySeasonId(String seasonId);

    long countBySeasonId(String seasonId);

    @Query("SELECT m FROM Match m JOIN FETCH m.createdBy WHERE m.season.id = :seasonId ORDER BY m.date DESC")
    List<Match> findBySeasonIdWithCreator(@Param("seasonId") String seasonId);
}
