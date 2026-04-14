package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.RuleMove;

import java.util.List;

public interface RuleMoveRepository extends JpaRepository<RuleMove, String> {
    List<RuleMove> findBySeasonId(String seasonId);

    List<RuleMove> findByIdIn(List<String> ids);

    boolean existsByIdAndSeasonId(String id, String seasonId);

    @Query("SELECT rm.id FROM RuleMove rm WHERE rm.id IN :ids AND rm.finishingMove = true")
    List<String> findFinishingMoveIds(@Param("ids") List<String> ids);

    @Query("SELECT rm.id FROM RuleMove rm WHERE rm.id IN :ids AND rm.season.id = :seasonId")
    List<String> findMovesByIdAndSeason(@Param("ids") List<String> ids, @Param("seasonId") String seasonId);

    default boolean allExistInSeason(List<String> ids, String seasonId) {
        return allExistInSeason(ids, seasonId, ids.size());
    }

    @Query("SELECT COUNT(rm) = :expectedCount FROM RuleMove rm WHERE rm.id IN :ids AND rm.season.id = :seasonId")
    boolean allExistInSeason(@Param("ids") List<String> ids, @Param("seasonId") String seasonId, @Param("expectedCount") long expectedCount);
}
