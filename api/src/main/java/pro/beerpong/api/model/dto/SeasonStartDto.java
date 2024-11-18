package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class SeasonStartDto {
    private SeasonDto oldSeason;
    private SeasonDto newSeason;
}