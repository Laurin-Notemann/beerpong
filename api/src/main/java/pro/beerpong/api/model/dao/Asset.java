package pro.beerpong.api.model.dao;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import pro.beerpong.api.util.AssetType;

@Entity(name = "assets")
@Data
public class Asset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private AssetType type;
    private double offsetX;
    private double offsetY;
    private double zoom;
}