package pro.beerpong.model;

import jakarta.persistence.*;
import lombok.Data;
<<<<<<< HEAD

import java.time.LocalDateTime;
=======
import java.time.LocalDateTime;
import java.util.UUID;
>>>>>>> 9b6c396 (Basic entity creation)

@Entity
@Data
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
<<<<<<< HEAD
    private String id;
=======
    private UUID id;
>>>>>>> 9b6c396 (Basic entity creation)

    private LocalDateTime date;

    @ManyToOne
    @JoinColumn(name = "seasonId")
    private Season season;
}
