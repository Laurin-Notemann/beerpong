package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.MatchMove;

import java.util.List;

public interface MatchMoveRepository extends JpaRepository<MatchMove, String> {

    List<MatchMove> findAllByTeamMemberId(String teamMemberId);

    void deleteAllByTeamMemberId(String teamMemberId);
}
