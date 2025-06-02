package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findAllBySeasonId(String seasonId);

    List<Player> findAllByProfileId(String profileId);
}