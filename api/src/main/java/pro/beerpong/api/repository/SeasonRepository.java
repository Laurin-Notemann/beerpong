package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;

import java.util.List;

public interface SeasonRepository extends JpaRepository<Season, String> {
    List<Season> findByGroupId(String groupId);
}
