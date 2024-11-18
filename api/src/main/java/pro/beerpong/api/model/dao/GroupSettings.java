package pro.beerpong.api.model.dao;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity(name = "group_settings")
@Data
public class GroupSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String settingValue;
}
