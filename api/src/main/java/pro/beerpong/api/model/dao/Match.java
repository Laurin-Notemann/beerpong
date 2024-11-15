package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity(name = "matches")
@Data
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private LocalDateTime date;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;
}
