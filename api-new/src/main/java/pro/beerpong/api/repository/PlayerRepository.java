package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Player;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findBySeasonId(String seasonId);

    @Query("SELECT p FROM Player p WHERE p.season.id = :seasonId AND p.activeThisSeason = true")
    List<Player> findBySeasonIdOnlyActive(String seasonId);

    @Query("SELECT p FROM Player p JOIN FETCH p.statistics, p.season WHERE p.season.id = :seasonId")
    List<Player> findBySeasonIdWithStatistics(@Param("seasonId") String seasonId);


    @Query("SELECT p FROM Player p JOIN FETCH p.statistics, p.season WHERE p.season.id = :seasonId AND p.id IN :ids")
    List<Player> findBySeasonIdWithStatisticsIn(@Param("seasonId") String seasonId, @Param("ids") List<String> ids);

    @Query("SELECT p FROM Player p JOIN FETCH p.statistics, p.season WHERE p.season.group.id = :groupId")
    List<Player> findByGroupIdWithStatistics(@Param("groupId") String groupId);

    @Query("SELECT p FROM Player p JOIN FETCH p.statistics, p.season WHERE p.season.group.id = :groupId AND p.id IN :ids")
    List<Player> findByGroupIdWithStatisticsIn(@Param("groupId") String groupId, @Param("ids") List<String> ids);

    long countBySeasonId(String seasonId);

    List<Player> findByProfileId(String profileId);

    @Query("SELECT p FROM Player p JOIN FETCH p.season WHERE p.profile.id = :profileId ORDER BY p.season.startDate DESC LIMIT 1")
    Optional<Player> findLatestByProfileId(@Param("profileId") String profileId);

    @Query("SELECT p FROM Player p WHERE p.season.group.id = :groupId")
    List<Player> findByGroupId(@Param("groupId") String groupId);

    Optional<Player> findByProfileIdAndSeasonId(String profileId, String seasonId);
}
