package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;

import java.util.List;

public interface PlayerStatisticsRepository extends JpaRepository<PlayerStatistics, String> {
}