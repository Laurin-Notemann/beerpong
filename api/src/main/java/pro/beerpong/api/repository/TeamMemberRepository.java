package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.TeamMember;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, String> {
    List<TeamMember> findByTeamId(String teamId);

    List<TeamMember> findByTeamIdIn(List<String> teamIds);

    @Query("SELECT tm FROM TeamMember tm JOIN FETCH tm.player JOIN FETCH tm.player.profile WHERE tm.team.id = :teamId")
    List<TeamMember> findByTeamIdWithPlayerAndProfile(@Param("teamId") String teamId);

    @Query("SELECT tm FROM TeamMember tm JOIN FETCH tm.player WHERE tm.team.id IN :teamIds")
    List<TeamMember> findByTeamIdsWithPlayer(@Param("teamIds") List<String> teamIds);

    @Modifying
    @Query("DELETE FROM TeamMember tm WHERE tm.team.match.id = :matchId")
    void deleteByMatchId(@Param("matchId") String matchId);
}
