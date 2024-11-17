package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.SeasonCreateDto;
import pro.beerpong.api.model.dto.SeasonDto;
import pro.beerpong.api.model.dto.SeasonStartDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.EventService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SeasonService {
    private final EventService eventService;
    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerService playerService;

    private final SeasonMapper seasonMapper;

    public SeasonDto startNewSeason(SeasonCreateDto dto, String groupId) {
        var groupOptional = groupRepository.findById(groupId);

        if (groupOptional.isEmpty()) {
            return null;
        }

        var group = groupOptional.get();
        var season = new Season();

        season.setStartDate(ZonedDateTime.now());
        season.setGroupId(groupOptional.get().getId());
        season = seasonRepository.save(season);

        var oldSeason = group.getActiveSeason();

        if (oldSeason != null) {
            var oldSeasonId = oldSeason.getId();
            oldSeason.setName(dto.getOldSeasonName());

            seasonRepository.save(oldSeason);
            playerService.copyPlayersFromOldSeason(oldSeasonId, season.getId());
        }

        group.setActiveSeason(season);
        groupRepository.save(group);

        var newDto = seasonMapper.seasonToSeasonDto(season);
        var eventDto = new SeasonStartDto();
        eventDto.setOldSeason(seasonMapper.seasonToSeasonDto(oldSeason));
        eventDto.setNewSeason(newDto);

        eventService.callEvent(new SocketEvent<>(SocketEventData.SEASON_START, groupId, eventDto));

        return newDto;
    }

    public List<SeasonDto> getAllSeasons(String groupId) {
        return seasonRepository.findByGroupId(groupId)
                .stream()
                .map(seasonMapper::seasonToSeasonDto)
                .toList();
    }

    public SeasonDto getSeasonById(String groupId, String id) {
        return seasonRepository.findById(id)
                .map(seasonMapper::seasonToSeasonDto)
                .orElse(null);
    }
}