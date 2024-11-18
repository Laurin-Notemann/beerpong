package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Match;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, String> {
    List<Match> findBySeasonId(String seasonId);
}