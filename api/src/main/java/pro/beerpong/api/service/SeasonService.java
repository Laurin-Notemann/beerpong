package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.NullablePair;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SeasonService {
    private final SubscriptionHandler subscriptionHandler;
    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerService playerService;
    private final RuleMoveService ruleMoveService;
    private final RuleService ruleService;
    private final SeasonMapper seasonMapper;

    @Autowired
    public SeasonService(SubscriptionHandler subscriptionHandler,
                         SeasonRepository seasonRepository,
                         GroupRepository groupRepository,
                         PlayerService playerService,
                         RuleMoveService ruleMoveService,
                         RuleService ruleService,
                         SeasonMapper seasonMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.seasonRepository = seasonRepository;
        this.groupRepository = groupRepository;
        this.playerService = playerService;
        this.ruleMoveService = ruleMoveService;
        this.ruleService = ruleService;
        this.seasonMapper = seasonMapper;
    }

    public SeasonDto startNewSeason(SeasonCreateDto dto, String groupId) {
        var groupOptional = groupRepository.findById(groupId);

        if (groupOptional.isEmpty()) {
            return null;
        }

        var group = groupOptional.get();
        var season = new Season();
        var oldSeason = group.getActiveSeason();

        season.setStartDate(ZonedDateTime.now());
        season.setGroupId(groupOptional.get().getId());
        season.setSeasonSettings(new SeasonSettings());

        if (oldSeason != null && oldSeason.getSeasonSettings() != null) {
            season.getSeasonSettings().setMaxTeamSize(oldSeason.getSeasonSettings().getMaxTeamSize());
            season.getSeasonSettings().setMinTeamSize(oldSeason.getSeasonSettings().getMinTeamSize());
            season.getSeasonSettings().setMinMatchesToQualify(oldSeason.getSeasonSettings().getMinMatchesToQualify());
            season.getSeasonSettings().setRankingAlgorithm(oldSeason.getSeasonSettings().getRankingAlgorithm());
            season.getSeasonSettings().setDailyLeaderboard(oldSeason.getSeasonSettings().getDailyLeaderboard());
            season.getSeasonSettings().setWakeTimeHour(oldSeason.getSeasonSettings().getWakeTimeHour());
        }

        season = seasonRepository.save(season);

        if (oldSeason != null) {
            oldSeason.setName(dto.getOldSeasonName());
            oldSeason.setEndDate(ZonedDateTime.now());

            oldSeason = seasonRepository.save(oldSeason);

            playerService.copyPlayersFromOldSeason(oldSeason, season);
            ruleService.copyRulesFromOldSeason(oldSeason, season);
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

    public SeasonDto updateSeason(Season season, SeasonUpdateDto dto) {
        return Optional.ofNullable(season)
                .map(existingSeason -> {
                    if (existingSeason.getSeasonSettings() == null) {
                        dto.getSeasonSettings().setId(null);
                        existingSeason.setSeasonSettings(dto.getSeasonSettings());
                    } else {
                        existingSeason.getSeasonSettings().setMaxTeamSize(dto.getSeasonSettings().getMaxTeamSize());
                        existingSeason.getSeasonSettings().setMinTeamSize(dto.getSeasonSettings().getMinTeamSize());
                        existingSeason.getSeasonSettings().setMinMatchesToQualify(dto.getSeasonSettings().getMinMatchesToQualify());
                        existingSeason.getSeasonSettings().setRankingAlgorithm(dto.getSeasonSettings().getRankingAlgorithm());
                        existingSeason.getSeasonSettings().setDailyLeaderboard(dto.getSeasonSettings().getDailyLeaderboard());
                        existingSeason.getSeasonSettings().setWakeTimeHour(dto.getSeasonSettings().getWakeTimeHour());
                    }

                    var seasonDto = seasonMapper.seasonToSeasonDto(seasonRepository.save(existingSeason));

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.SEASON_UPDATE, seasonDto.getGroupId(), seasonDto));

                    return seasonDto;
                })
                .orElse(null);
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
        return getRawSeasonById(id)
                .map(seasonMapper::seasonToSeasonDto)
                .orElse(null);
    }

    public Optional<Season> getRawSeasonById(String id) {
        return seasonRepository.findById(id);
    }
}