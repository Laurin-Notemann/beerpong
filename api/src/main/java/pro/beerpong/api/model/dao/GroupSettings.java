package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class GroupSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;

    private String settingValue;
}
