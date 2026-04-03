package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pro.beerpong.api.model.dao.GroupMember;

import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {

    List<GroupMember> findByUserId(String userId);

    List<GroupMember> findByGroupId(String groupId);

    Optional<GroupMember> findByUserIdAndGroupId(String userId, String groupId);

    boolean existsByUserIdAndGroupId(String userId, String groupId);

    void deleteByUserIdAndGroupId(String userId, String groupId);

    @Query("SELECT gm FROM GroupMember gm JOIN FETCH gm.group WHERE gm.user.id = :userId AND gm.active = true")
    List<GroupMember> findGroupsOfUser(@Param("userId") String userId);
}
