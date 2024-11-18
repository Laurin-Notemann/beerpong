package pro.beerpong.api.model.dao;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.ZonedDateTime;

@Entity(name = "assets")
@Data
public class Asset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private byte[] data;
    private String mediaType;
    private ZonedDateTime uploadedAt;
}