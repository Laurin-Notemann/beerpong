package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "profiles")
@Data
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;
    //private String profilePicture; TODO store asset

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;
}
