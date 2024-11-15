package pro.beerpong.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

<<<<<<< HEAD
=======
import java.util.UUID;

>>>>>>> 9b6c396 (Basic entity creation)
@Entity
@Data
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
<<<<<<< HEAD
    private String id;
=======
    private UUID id;
>>>>>>> 9b6c396 (Basic entity creation)

    private String name;
}
