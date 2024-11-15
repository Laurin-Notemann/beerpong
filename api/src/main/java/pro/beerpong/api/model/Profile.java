package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;
    private String profilePicture;

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;
}
