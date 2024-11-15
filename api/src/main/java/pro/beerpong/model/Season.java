package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Data
public class Season {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String seasonName;

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;
}
