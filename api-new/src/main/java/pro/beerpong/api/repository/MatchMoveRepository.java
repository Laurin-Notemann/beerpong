package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dao.TeamMember;

import java.util.List;

public interface MatchMoveRepository extends JpaRepository<MatchMove, String> {
    List<MatchMove> findByTeamMemberId(String teamMemberId);

    void deleteAllByTeamMemberId(String teamMemberId);

    @Query("SELECT mm FROM MatchMove mm JOIN FETCH mm.ruleMove WHERE mm.teamMember.id IN :teamMemberIds")
    List<MatchMove> findByTeamMemberIdsWithRuleMove(@Param("teamMemberIds") List<String> teamMemberIds);
}
