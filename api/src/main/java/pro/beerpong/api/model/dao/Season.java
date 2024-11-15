package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.ZonedDateTime;

@Entity(name = "seasons")
@Data
public class Season {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private ZonedDateTime startDate;

    private ZonedDateTime endDate;

    @ManyToOne
    @JoinColumn(name = "groupId")
    private Group group;

}
