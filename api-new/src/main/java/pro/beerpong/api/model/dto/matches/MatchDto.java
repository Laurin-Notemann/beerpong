package pro.beerpong.api.model.dto.matches;

import lombok.Data;
import org.jetbrains.annotations.Nullable;

import java.time.ZonedDateTime;
import java.util.List;

@Data
public class MatchDto {
    private String id;
    private ZonedDateTime date;
    private String seasonId;
    private String createdById;
    private @Nullable List<TeamPhotoDto> photoUploads;
}