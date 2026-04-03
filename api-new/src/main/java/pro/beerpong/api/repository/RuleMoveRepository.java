package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.RuleMove;

import java.util.List;

public interface RuleMoveRepository extends JpaRepository<RuleMove, String> {
    List<RuleMove> findBySeasonId(String seasonId);
}
