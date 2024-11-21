package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Team;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, String> {
    List<Team> findAllByMatchId(String matchId);
}
