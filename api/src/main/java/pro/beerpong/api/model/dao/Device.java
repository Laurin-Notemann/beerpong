package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import pro.beerpong.api.util.InstallationType;

@Entity(name = "devices")
@Data
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private InstallationType type;
    private String deviceId;
    private String pushNotificationToken;
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}
