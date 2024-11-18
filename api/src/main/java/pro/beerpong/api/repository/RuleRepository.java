package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Rule;

import java.util.List;

public interface RuleRepository extends JpaRepository<Rule, String> {
    List<Rule> findBySeasonId(String seasonId);

    void deleteBySeasonId(String seasonId);
}
