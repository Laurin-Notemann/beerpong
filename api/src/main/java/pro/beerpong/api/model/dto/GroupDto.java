package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.GroupSettings;
import pro.beerpong.api.model.dao.Season;

@Data
public class GroupDto {
    private String id;
    private String name;
    private String inviteCode;
    private GroupSettings groupSettings;
    private Season activeSeason;
}
