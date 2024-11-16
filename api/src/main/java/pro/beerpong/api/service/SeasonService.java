package pro.beerpong.api.service;

import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.SeasonCreateDto;
import pro.beerpong.api.model.dto.SeasonDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.SeasonRepository;

@Service
public class SeasonService {
    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerService playerService;

    private final SeasonMapper seasonMapper;

    @Autowired
    public SeasonService(SeasonRepository seasonRepository, GroupRepository groupRepository, PlayerService playerService, SeasonMapper seasonMapper) {
        this.seasonRepository = seasonRepository;
        this.groupRepository = groupRepository;
        this.playerService = playerService;
        this.seasonMapper = seasonMapper;
    }

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

        if (group.getActiveSeason() != null) {
            var oldSeasonId = group.getActiveSeason().getId();
            group.getActiveSeason().setName(dto.getOldSeasonName());

            seasonRepository.save(group.getActiveSeason());
            playerService.copyPlayersFromOldSeason(oldSeasonId, season.getId());
        }

        group.setActiveSeason(season);
        groupRepository.save(group);

        return seasonMapper.seasonToSeasonDto(season);
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