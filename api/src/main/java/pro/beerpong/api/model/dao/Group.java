package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import pro.beerpong.api.model.dto.GroupPreset;

@Entity(name = "groups")
@Data
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;
    private String inviteCode;
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn
    private Season activeSeason;
    @OneToOne
    @JoinColumn(name = "assetIdWallpaper")
    private Asset wallpaperAsset;
    private String sportPreset;
    private String customSportName;
}
