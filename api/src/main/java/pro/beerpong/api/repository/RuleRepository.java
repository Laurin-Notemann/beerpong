package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Device;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Rule;

import java.util.List;
import java.util.Optional;

public interface RuleRepository extends JpaRepository<Rule, String> {
    List<Rule> findBySeasonId(String seasonId);

    void deleteBySeasonId(String seasonId);
}