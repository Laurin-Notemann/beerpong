package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

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
