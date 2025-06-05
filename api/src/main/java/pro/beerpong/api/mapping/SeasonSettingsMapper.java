package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.SeasonSettingsDto;
import pro.beerpong.api.sockets.LocalTimeAdapter;

import java.time.LocalTime;

@Mapper(componentModel = "spring")
public abstract class SeasonSettingsMapper {
    @Mapping(target = "wakeTime", expression = "java(parseTime(seasonSettingsDto))")
    public abstract SeasonSettings seasonSettingsDtoToSeasonSettings(SeasonSettingsDto seasonSettingsDto);

    protected LocalTime parseTime(SeasonSettingsDto seasonSettingsDto) {
        return LocalTime.parse(seasonSettingsDto.getWakeTime(), LocalTimeAdapter.FORMATTER);
    }
}