package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class SeasonCreateDto {
    public static final int SEASON_NAME_MIN_LENGTH = 2;
    public static final int SEASON_NAME_MAX_LENGTH = 50;

    private String oldSeasonName;

    public boolean invalidName() {
        return this.oldSeasonName == null || this.oldSeasonName.isEmpty() ||
                this.oldSeasonName.length() < SEASON_NAME_MIN_LENGTH ||
                this.oldSeasonName.length() > SEASON_NAME_MAX_LENGTH;
    }
}