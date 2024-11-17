package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

@Data
public class SeasonStartDto {
    private SeasonDto oldSeason;
    private SeasonDto newSeason;
}