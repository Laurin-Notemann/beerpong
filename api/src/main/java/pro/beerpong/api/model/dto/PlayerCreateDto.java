package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Season;

@Data
public class PlayerCreateDto {
    private String profileId;
}
