package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findAllBySeasonId(String seasonId);

    @Query("""
           SELECT new pro.beerpong.api.model.dao.PlayerStatistics(
                      COALESCE((SELECT COUNT(*)
                                FROM matches m
                                JOIN m.teams t
                                JOIN t.teamMembers tm
                                WHERE tm.player.id = :playerId
                                GROUP BY tm.player), 0),
                      COALESCE((SELECT SUM(mm.value * rm.pointsForScorer)
                                FROM match_moves mm
                                JOIN mm.move rm
                                JOIN mm.teamMember tm
                                WHERE tm.player.id = :playerId
                                GROUP BY tm.player), 0) +
                      COALESCE((SELECT SUM(mm.value * rm.pointsForTeam)
                                FROM match_moves mm
                                JOIN mm.move rm
                                JOIN mm.teamMember tmm
                                JOIN tmm.team.teamMembers tmt
                                WHERE tmt.player.id = :playerId
                                GROUP BY tmt.player), 0))
           FROM players p
           WHERE p.id = :playerId
           """)
    PlayerStatistics getStatisticsForPlayer(String playerId);
}