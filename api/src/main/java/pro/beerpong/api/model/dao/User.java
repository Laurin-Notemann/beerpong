package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToMany(mappedBy = "user")
    private List<Device> devices;

    @OneToMany(mappedBy = "user")
    private List<GroupMember> groups;

    // future: premium subscriptions and other stuff here
}
