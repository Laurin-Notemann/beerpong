package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dao.TeamMember;

import java.util.List;

public interface MatchMoveRepository extends JpaRepository<MatchMove, String> {
    List<MatchMove> findByTeamMemberIdIn(List<String> teamMemberIds);

    List<MatchMove> findByTeamMemberId(String teamMemberIds);

    void deleteAllByTeamMemberId(String teamMemberId);

    @Query("SELECT mm FROM MatchMove mm JOIN FETCH mm.ruleMove WHERE mm.teamMember.id IN :teamMemberIds")
    List<MatchMove> findByTeamMemberIdsWithRuleMove(@Param("teamMemberIds") List<String> teamMemberIds);

    @Modifying
    @Query("DELETE FROM MatchMove mm WHERE mm.teamMember.team.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") String matchId);
}
