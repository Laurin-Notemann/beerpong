package pro.beerpong.api.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import pro.beerpong.api.model.dao.Rule;
import pro.beerpong.api.model.dao.RuleMove;

public interface RuleMoveRepository extends JpaRepository<RuleMove, String> {
    List<RuleMove> findBySeasonId(String seasonId);


}
