package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.PlayerStatistics;
import pro.beerpong.api.model.dao.User;

public interface PlayerStatisticsRepository extends JpaRepository<PlayerStatistics, String> {
}
