package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findAllBySeasonId(String seasonId);

    @Query("SELECT new pro.beerpong.api.model.dao.PlayerStatistics(" +
            "COALESCE(SUM(mm.value * rm.pointsForScorer), 0), " +
            "COALESCE(COUNT(m), 0)) " +
            "FROM players p " +
            "LEFT JOIN team_members tm ON p.id = tm.player.id " +
            "LEFT JOIN teams t ON tm.team.id = t.id " +
            "LEFT JOIN matches m ON t.match.id = m.id " +
            "LEFT JOIN match_moves mm ON mm.teamMember.id = tm.id " +
            "LEFT JOIN rule_moves rm ON mm.move.id = rm.id " +
            "WHERE p.id = :playerId " +
            "GROUP BY p.id")
    PlayerStatistics getStatisticsForPlayer(String playerId);
}