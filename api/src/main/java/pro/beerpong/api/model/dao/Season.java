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

    private String groupId;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn
    private SeasonSettings seasonSettings;

    //TODO needed?
    @PostLoad
    public void ensureDefaultSeasonSettings() {
        if (this.seasonSettings == null) {
            this.seasonSettings = new SeasonSettings();
        }
    }
}
