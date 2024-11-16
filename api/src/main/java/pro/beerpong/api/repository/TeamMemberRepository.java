package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.TeamMember;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findAllByTeamId(String teamId);
}
