package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Match;

import java.time.ZonedDateTime;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, String> {
    List<Match> findBySeasonId(String seasonId);

    @Query("SELECT DISTINCT m FROM Match m JOIN Team t ON t.match.id = m.id JOIN TeamMember tm ON tm.team.id = t.id WHERE m.season.id = :seasonId AND tm.player.id = :playerId")
    List<Match> findBySeasonIdAndPlayerId(@Param("seasonId") String seasonId, @Param("playerId") String playerId);

    long countBySeasonId(String seasonId);

    @Query("SELECT m FROM Match m JOIN FETCH m.createdBy WHERE m.season.id = :seasonId ORDER BY m.date DESC")
    List<Match> findBySeasonIdWithCreator(@Param("seasonId") String seasonId);

    @Query("SELECT m FROM Match m WHERE m.season.group.id = :groupId")
    List<Match> findByGroupId(@Param("groupId") String groupId);

    @Query("SELECT COUNT(m) FROM Match m WHERE m.season.group.id = :groupId AND m.season.endDate IS NOT NULL")
    long countMatchesInPastSeasons(@Param("groupId") String groupId);

    Match getMatchById(String id);

    @Query("SELECT m FROM Match m WHERE m.season.id = :seasonId AND m.date >= :since")
    List<Match> findBySeasonIdAndDateAfter(@Param("seasonId") String seasonId, @Param("since") ZonedDateTime since);

    boolean existsByIdAndSeasonId(String matchId, String seasonId);
}
