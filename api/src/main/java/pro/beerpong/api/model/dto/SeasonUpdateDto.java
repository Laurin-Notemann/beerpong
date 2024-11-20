package pro.beerpong.api.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import pro.beerpong.api.model.dao.SeasonSettings;

import java.util.List;

@Data
public class SeasonUpdateDto {
    private @NotNull SeasonSettings seasonSettings;
}
