package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity(name = "group_members")
@Data
public class GroupMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private boolean active;
    @ManyToOne
    @JoinColumn(name = "group_id")
    private Group group;
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}
