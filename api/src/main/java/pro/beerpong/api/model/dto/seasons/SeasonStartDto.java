package pro.beerpong.api.model.dto.seasons;

import lombok.Data;

@Data
public class SeasonStartDto {
    private SeasonDto oldSeason;
    private SeasonDto newSeason;
}