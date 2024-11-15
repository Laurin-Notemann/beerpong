package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

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
