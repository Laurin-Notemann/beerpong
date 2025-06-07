package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.GroupMember;

import java.util.List;

public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {
    List<GroupMember> findByUserId(String userId);

    boolean existsByUserIdAndGroupId(String userId, String groupId);
}