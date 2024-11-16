package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.MatchMove;

public interface MatchMoveRepository extends JpaRepository<MatchMove, String> {
}
