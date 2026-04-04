package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Player;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findBySeasonId(String seasonId);

    List<Player> findByProfileId(String profileId);

    @Query("SELECT p FROM Player p JOIN FETCH p.season WHERE p.profile.id = :profileId ORDER BY p.season.startDate DESC LIMIT 1")
    Optional<Player> findLatestByProfileId(@Param("profileId") String profileId);

    @Query("SELECT p FROM Player p JOIN FETCH p.statistics WHERE p.season.id = :seasonId AND p.activeThisSeason = true")
    List<Player> findActivePlayersWithStatistics(@Param("seasonId") String seasonId);

    @Query("SELECT p FROM Player p JOIN FETCH p.statistics JOIN FETCH p.profile WHERE p.season.id = :seasonId")
    List<Player> findAllPlayersWithStatistics(@Param("seasonId") String seasonId);

    Optional<Player> findByProfileIdAndSeasonId(String profileId, String seasonId);
}
