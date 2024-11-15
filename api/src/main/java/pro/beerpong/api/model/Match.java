package pro.beerpong.api.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
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
