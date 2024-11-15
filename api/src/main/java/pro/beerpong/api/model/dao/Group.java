package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;
    private String inviteCode;
    @OneToOne(mappedBy = "group", cascade = CascadeType.ALL)
    private GroupSettings groupSettings;
}
