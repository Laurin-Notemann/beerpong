package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity(name = "group_settings")
@Data
public class GroupSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne
    @JoinColumn(name = "group_id", referencedColumnName = "id")
    private Group group;

    private String settingValue;
}
