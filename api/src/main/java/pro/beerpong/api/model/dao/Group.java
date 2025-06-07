package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.Data;
import pro.beerpong.api.model.dto.GroupPreset;

import java.time.ZonedDateTime;
import java.util.List;

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
    @OneToMany(mappedBy = "group")
    private List<GroupMember> members;
    private ZonedDateTime createdAt;
    private String sportPreset;
    private String customSportName;
}
