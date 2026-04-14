package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dto.groups.GroupWithStats;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, String> {
    Optional<Group> findByInviteCode(String inviteCode);

    List<Group> findByIdIn(List<String> ids);

    @Query("SELECT g FROM Group g LEFT JOIN FETCH g.activeSeason WHERE g.id = :id")
    Optional<Group> findByIdWithActiveSeason(@Param("id") String id);

    @Query("""
            SELECT new pro.beerpong.api.model.dto.groups.GroupWithStats(
                g,
                (SELECT COUNT(m) FROM Match m WHERE m.season.id = g.activeSeason.id),
                (SELECT COUNT(p) FROM Player p WHERE p.season.id = g.activeSeason.id),
                (SELECT COUNT(s) FROM Season s WHERE s.group.id = g.id)
            )
            FROM Group g WHERE g.id IN :ids
            """)
    List<GroupWithStats> findByIdInWithStats(@Param("ids") List<String> ids);

    @Query("""
            SELECT new pro.beerpong.api.model.dto.groups.GroupWithStats(
                g,
                (SELECT COUNT(m) FROM Match m WHERE m.season.id = g.activeSeason.id),
                (SELECT COUNT(p) FROM Player p WHERE p.season.id = g.activeSeason.id),
                (SELECT COUNT(s) FROM Season s WHERE s.group.id = g.id)
            )
            FROM Group g WHERE g.id = :groupId
            """)
    Optional<GroupWithStats> findByIdWithStats(@Param("groupId") String groupId);

    record GroupStatsProjection(long matches, long players, long seasons) {
    }
}
