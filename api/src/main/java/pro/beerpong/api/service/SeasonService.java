package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.NullablePair;

import java.time.ZonedDateTime;
import java.util.List;

@Service
public class SeasonService {
    private final SubscriptionHandler subscriptionHandler;
    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerService playerService;
    private final RuleMoveService ruleMoveService;
    private final SeasonMapper seasonMapper;

    @Autowired
    public SeasonService(SubscriptionHandler subscriptionHandler,
                         SeasonRepository seasonRepository,
                         GroupRepository groupRepository,
                         PlayerService playerService,
                         RuleMoveService ruleMoveService,
                         SeasonMapper seasonMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.seasonRepository = seasonRepository;
        this.groupRepository = groupRepository;
        this.playerService = playerService;
        this.ruleMoveService = ruleMoveService;
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

        var oldSeason = group.getActiveSeason();

        if (oldSeason != null) {
            oldSeason.setName(dto.getOldSeasonName());
            oldSeason.setEndDate(ZonedDateTime.now());

            oldSeason = seasonRepository.save(oldSeason);

            playerService.copyPlayersFromOldSeason(oldSeason, season);
            ruleMoveService.copyRuleMovesFromOldSeason(oldSeason, season);
        }

        group.setActiveSeason(season);
        groupRepository.save(group);

        var newDto = seasonMapper.seasonToSeasonDto(season);
        var eventDto = new SeasonStartDto();
        eventDto.setOldSeason(seasonMapper.seasonToSeasonDto(oldSeason));
        eventDto.setNewSeason(newDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.SEASON_START, groupId, eventDto));

        return newDto;
    }

    public NullablePair<Group, Season> getSeasonAndGroup(String groupId, String seasonId) {
        return NullablePair.of(groupRepository.findById(groupId).orElse(null), seasonRepository.findById(seasonId).orElse(null));
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> validateSeason(Class<T> dtoClass, NullablePair<Group, Season> pair) {
        if (pair.getFirst() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return null;
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> validateActiveSeason(Class<T> dtoClass, NullablePair<Group, Season> pair) {
        var err = validateSeason(dtoClass, pair);

        if (err != null) {
            return err;
        }

        if (pair.getSecond().getEndDate() != null) {
            return ResponseEnvelope.notOk(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.SEASON_ALREADY_ENDED);
        }

        return null;
    }

    public List<SeasonDto> getAllSeasons(String groupId) {
        return seasonRepository.findByGroupId(groupId)
                .stream()
                .map(seasonMapper::seasonToSeasonDto)
                .toList();
    }

    public SeasonDto getSeasonById(String id) {
        return seasonRepository.findById(id)
                .map(seasonMapper::seasonToSeasonDto)
                .orElse(null);
    }
}