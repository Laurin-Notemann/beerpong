package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Season {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String seasonName;

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;
}
