package pro.beerpong.api.model.dto.seasons;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SeasonUpdateDto {
    private @NotNull SeasonSettingsDto seasonSettings;
}
