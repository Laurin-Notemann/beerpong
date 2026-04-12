package pro.beerpong.api.model.dao;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "groups")
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private String inviteCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "active_season_id", unique = true)
    private Season activeSeason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id_wallpaper")
    private Asset wallpaper;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private GroupMember createdBy;

    private ZonedDateTime createdAt;

    private String sportPreset;

    private String customSportName;
}
