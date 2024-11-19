package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findAllBySeasonId(String seasonId);

    @Query("""
           WITH matchCounts AS (
                SELECT COUNT(*) AS count, tm.player.id AS playerId
                FROM matches m
                JOIN m.teams t
                JOIN t.teamMembers tm
                GROUP BY tm.player
           ), scorerPointsSum AS (
                SELECT SUM(mm.value * rm.pointsForScorer) AS points,
                           tm.player.id AS playerId
                FROM match_moves mm
                JOIN mm.move rm
                JOIN mm.teamMember tm
                GROUP BY tm.player
           ), teamPointsSum AS (
                SELECT SUM(mm.value * rm.pointsForTeam) AS points,
                           tmt.player.id AS playerId
                FROM match_moves mm
                JOIN mm.move rm
                JOIN mm.teamMember tmm
                JOIN tmm.team.teamMembers tmt
                GROUP BY tmt.player
           )
           SELECT new pro.beerpong.api.model.dao.PlayerStatistics(COALESCE(mc.count, 0),
                      COALESCE(sps.points, 0) + COALESCE(tps.points, 0))
           FROM players p
           LEFT JOIN (SELECT mc.count AS count FROM matchCounts mc WHERE mc.playerId = :playerId) AS mc
           LEFT JOIN (SELECT sps.points AS points FROM scorerPointsSum sps WHERE sps.playerId = :playerId) AS sps
           LEFT JOIN (SELECT tps.points AS points FROM teamPointsSum tps WHERE tps.playerId = :playerId) AS tps
           WHERE p.id = :playerId
           """)
    PlayerStatistics getStatisticsForPlayer(String playerId);
}