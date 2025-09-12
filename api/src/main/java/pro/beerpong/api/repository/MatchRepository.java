package pro.beerpong.api.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.MatchMove;

public interface MatchRepository extends JpaRepository<Match, String> {
    List<Match> findBySeasonId(String seasonId);

    long countBySeasonId(String seasonId);

    @Query("""
              select distinct m
              from matches m
                join fetch m.season s
                left join fetch m.teams t
                left join fetch t.teamMembers tm
                left join fetch tm.matchMoves mm
                left join fetch mm.move mv
              where s.id = :seasonId
            """)
    List<Match> fetchMatchesBySeasonId(@Param("seasonId") String seasonId);

    @EntityGraph(attributePaths = {"season", "teams", "teams.teamMembers"})
    List<Match> findBySeason_Id(String seasonId);

    @Query("""
              select mm from match_moves mm
                join fetch mm.move mv
                join mm.teamMember tm
              where tm.id in :tmIds
            """)
    List<MatchMove> findAllByTeamMemberIds(@Param("tmIds") Collection<String> ids);
}