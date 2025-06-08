package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.*;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.PlayerStatisticsRepository;
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
    private final LeaderboardService leaderboardService;
    private final GroupMapper groupMapper;
    private final PlayerMapper playerMapper;
    private final PlayerStatisticsRepository playerStatisticsRepository;
    private final PlayerRepository playerRepository;
    private final ProfileMapper profileMapper;
    private final PlayerStatisticsMapper playerStatisticsMapper;
    private final GroupService groupService;
    private final AuthService authService;

    @Autowired
    public SeasonService(SubscriptionHandler subscriptionHandler,
                         SeasonRepository seasonRepository,
                         GroupRepository groupRepository,
                         PlayerService playerService,
                         RuleMoveService ruleMoveService,
                         RuleService ruleService,
                         SeasonMapper seasonMapper, LeaderboardService leaderboardService, GroupMapper groupMapper, PlayerMapper playerMapper, PlayerStatisticsRepository playerStatisticsRepository, PlayerRepository playerRepository, ProfileMapper profileMapper, PlayerStatisticsMapper playerStatisticsMapper, GroupService groupService, AuthService authService) {
        this.subscriptionHandler = subscriptionHandler;
        this.seasonRepository = seasonRepository;
        this.groupRepository = groupRepository;
        this.playerService = playerService;
        this.ruleMoveService = ruleMoveService;
        this.ruleService = ruleService;
        this.seasonMapper = seasonMapper;
        this.leaderboardService = leaderboardService;
        this.groupMapper = groupMapper;
        this.playerMapper = playerMapper;
        this.playerStatisticsRepository = playerStatisticsRepository;
        this.playerRepository = playerRepository;
        this.profileMapper = profileMapper;
        this.playerStatisticsMapper = playerStatisticsMapper;
        this.groupService = groupService;
        this.authService = authService;
    }

    public SeasonDto startNewSeason(SeasonCreateDto dto, String groupId, UserDto user) {
        var groupOptional = groupRepository.findById(groupId);

        if (groupOptional.isEmpty()) {
            return null;
        }

        var group = groupOptional.get();
        var newSeason = new Season();
        var oldSeason = group.getActiveSeason();

        newSeason.setStartDate(ZonedDateTime.now());
        newSeason.setGroupId(groupOptional.get().getId());
        newSeason.setSeasonSettings(new SeasonSettings());
        newSeason.setCreatedBy(authService.memberByUser(user, groupId));

        if (oldSeason != null && oldSeason.getSeasonSettings() != null) {
            newSeason.getSeasonSettings().setMaxTeamSize(oldSeason.getSeasonSettings().getMaxTeamSize());
            newSeason.getSeasonSettings().setMinTeamSize(oldSeason.getSeasonSettings().getMinTeamSize());
            newSeason.getSeasonSettings().setMinMatchesToQualify(oldSeason.getSeasonSettings().getMinMatchesToQualify());
            newSeason.getSeasonSettings().setRankingAlgorithm(oldSeason.getSeasonSettings().getRankingAlgorithm());
            newSeason.getSeasonSettings().setDailyLeaderboard(oldSeason.getSeasonSettings().getDailyLeaderboard());
            newSeason.getSeasonSettings().setWakeTimeHour(oldSeason.getSeasonSettings().getWakeTimeHour());
        }

        var season = seasonRepository.save(newSeason);

        if (oldSeason != null) {
            oldSeason.setName(dto.getOldSeasonName());
            oldSeason.setEndDate(ZonedDateTime.now());

            oldSeason = seasonRepository.save(oldSeason);

            var leaderboard = leaderboardService.generateLeaderboard(groupMapper.groupToGroupDto(group), "season", true, oldSeason.getId());

            leaderboard.getEntries().forEach(oldPlayerDto -> {
                var player = new Player();
                player.setId(null);
                player.setProfile(profileMapper.profileDtoToProfile(oldPlayerDto.getProfile()));
                player.setSeason(season);
                player.setActiveThisSeason(oldPlayerDto.isActiveThisSeason());

                var statistics = playerStatisticsMapper.playerStatisticsDtoToPlayerStatistics(oldPlayerDto.getStatistics());
                statistics.setId(null);

                statistics = playerStatisticsRepository.save(statistics);

                player.setStatistics(statistics);

                playerRepository.save(player);
            });

            ruleService.copyRulesFromOldSeason(oldSeason, season);
        }

        var finalSeason = season;
        dto.getRuleMoves().forEach(ruleMoveDto -> ruleMoveService.createRuleMove(group, finalSeason, ruleMoveDto, false));

        group.setActiveSeason(season);
        groupRepository.save(group);

        var newDto = seasonMapper.seasonToSeasonDto(season);
        var eventDto = new SeasonStartDto();
        eventDto.setOldSeason(seasonMapper.seasonToSeasonDto(oldSeason));
        eventDto.setNewSeason(newDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.SEASON_START, groupId, eventDto));

        return newDto;
    }

    public List<PlayerDto> calcStatsForPlayersInSeason(String seasonId, boolean showInactive, boolean showStats) {
        var players = playerService.getBySeasonId(seasonId, showInactive);
        var season = seasonRepository.findById(seasonId).orElse(null);

        if (showStats && season != null) {
            return leaderboardService.generateLeaderboard(
                    groupService.getRawGroupById(season.getGroupId()),
                            "season",
                            true,
                            seasonId,
                            players.stream()
                    )
                    .getEntries();
        } else {
            return players.stream()
                    .peek(playerDto -> playerDto.setStatistics(null))
                    .toList();
        }
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
            return ResponseEnvelope.notOk(ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroupId())) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return null;
    }

    public <T> ResponseEntity<ResponseEnvelope<T>> validateActiveSeason(Class<T> dtoClass, NullablePair<Group, Season> pair) {
        var err = validateSeason(dtoClass, pair);

        if (err != null) {
            return err;
        }

        if (pair.getSecond().getEndDate() != null) {
            return ResponseEnvelope.notOk(ErrorCodes.SEASON_ALREADY_ENDED);
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