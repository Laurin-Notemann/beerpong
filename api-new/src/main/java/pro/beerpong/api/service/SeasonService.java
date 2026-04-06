package pro.beerpong.api.service;

import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.*;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.player.PlayerDtoExtended;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
import pro.beerpong.api.model.dto.seasons.SeasonStartDto;
import pro.beerpong.api.model.dto.seasons.SeasonUpdateDto;
import pro.beerpong.api.model.dto.user.UserDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.LocalTimeAdapter;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.NullablePair;

import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SeasonService {
    private final SubscriptionHandler subscriptionHandler;

    private final SeasonRepository seasonRepository;
    private final GroupRepository groupRepository;
    private final PlayerStatisticsRepository playerStatisticsRepository;
    private final PlayerRepository playerRepository;

    private final AuthService authService;
    private final RuleMoveService ruleMoveService;
    private final RuleService ruleService;
    private final LeaderboardService leaderboardService;

    private final SeasonMapper seasonMapper;
    private final ProfileMapper profileMapper;
    private final PlayerStatisticsMapper playerStatisticsMapper;
    private final ProfileRepository profileRepository;
    private final GroupMapper groupMapper;
    private final GroupService groupService;
    private final PlayerService playerService;
    private final PlayerMapper playerMapper;

    public ServiceResponse<SeasonDto> startNewSeason(@NotNull SeasonCreateDto dto, @NotNull String groupId, @NotNull UserDto user) {
        var createdByOptional = authService.getMemberInGroup(user.getId(), groupId);

        if (createdByOptional.isEmpty()) {
            return ServiceResponse.error(ErrorCodes.AUTH_USER_NOT_IN_GROUP);
        }

        var createdBy = createdByOptional.get();
        var groupOptional = groupRepository.findById(groupId);

        if (groupOptional.isEmpty()) {
            return ServiceResponse.error(ErrorCodes.GROUP_NOT_FOUND);
        }

        var group = groupOptional.get();
        var newSeason = new Season();
        var oldSeason = group.getActiveSeason();

        newSeason.setStartDate(ZonedDateTime.now());
        newSeason.setGroup(group);
        newSeason.setSeasonSettings(SeasonSettings.createDefault());
        newSeason.setCreatedBy(createdBy);

        if (oldSeason != null && oldSeason.getSeasonSettings() != null) {
            newSeason.getSeasonSettings().setMaxTeamSize(oldSeason.getSeasonSettings().getMaxTeamSize());
            newSeason.getSeasonSettings().setMinTeamSize(oldSeason.getSeasonSettings().getMinTeamSize());
            newSeason.getSeasonSettings().setMinMatchesToQualify(oldSeason.getSeasonSettings().getMinMatchesToQualify());
            newSeason.getSeasonSettings().setRankingAlgorithm(oldSeason.getSeasonSettings().getRankingAlgorithm());
            newSeason.getSeasonSettings().setDailyLeaderboard(oldSeason.getSeasonSettings().getDailyLeaderboard());
            newSeason.getSeasonSettings().setWakeTime(oldSeason.getSeasonSettings().getWakeTime());
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
                player.setProfile(profileRepository.getReferenceById(oldPlayerDto.getProfileId()));
                player.setSeason(season);
                player.setActiveThisSeason(oldPlayerDto.isActiveThisSeason());

                var statistics = playerStatisticsMapper.playerStatisticsDtoToPlayerStatistics(oldPlayerDto.getStatistics());
                statistics.setId(null);

                statistics = playerStatisticsRepository.save(statistics);

                player.setStatistics(statistics);

                playerRepository.save(player);
            });

            ruleService.copyRulesFromOldSeason(oldSeason.getId(), season.getId(), groupId);
        }

        dto.getRuleMoves().forEach(ruleMoveDto -> ruleMoveService.createRuleMove(group.getId(), season, ruleMoveDto, false));

        group.setActiveSeason(season);
        groupRepository.save(group);

        var newDto = seasonMapper.seasonToSeasonDto(season);
        var eventDto = new SeasonStartDto();

        eventDto.setOldSeason(seasonMapper.seasonToSeasonDto(oldSeason));
        eventDto.setNewSeason(newDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.SEASON_START, groupId, eventDto));

        return ServiceResponse.ok(newDto);
    }

    public List<PlayerDtoExtended> getPlayersWithStats(String groupId, String seasonId, boolean showInactive, boolean showStats) {
        var players = playerService.getPlayerIdsInSeason(seasonId, showInactive);

        if (showStats) {
            return leaderboardService.generateLeaderboard(
                            groupService.getGroupById(groupId),
                            "season",
                            true,
                            seasonId,
                            players
                    )
                    .getEntries();
        } else {
            return playerRepository.findByIdInWithStatistics(players).stream()
                    .peek(playerDto -> playerDto.setStatistics(null))
                    .map(playerMapper::playerToPlayerDtoExtended)
                    .toList();
        }
    }

    public SeasonDto updateSeason(Season season, SeasonUpdateDto dto) {
        return Optional.ofNullable(season)
                .map(existingSeason -> {
                    if (existingSeason.getSeasonSettings() == null) {
                        existingSeason.setSeasonSettings(SeasonSettings.createDefault());
                    }

                    if (dto.getSeasonSettings().getMinMatchesToQualify() != null)
                        existingSeason.getSeasonSettings().setMinMatchesToQualify(dto.getSeasonSettings().getMinMatchesToQualify());
                    if (dto.getSeasonSettings().getMinTeamSize() != null)
                        existingSeason.getSeasonSettings().setMinTeamSize(dto.getSeasonSettings().getMinTeamSize());
                    if (dto.getSeasonSettings().getMaxTeamSize() != null)
                        existingSeason.getSeasonSettings().setMaxTeamSize(dto.getSeasonSettings().getMaxTeamSize());
                    if (dto.getSeasonSettings().getWakeTime() != null)
                        existingSeason.getSeasonSettings().setWakeTime(LocalTime.parse(dto.getSeasonSettings().getWakeTime(), LocalTimeAdapter.FORMATTER));
                    if (dto.getSeasonSettings().getDailyLeaderboard() != null)
                        existingSeason.getSeasonSettings().setDailyLeaderboard(dto.getSeasonSettings().getDailyLeaderboard());
                    if (dto.getSeasonSettings().getRankingAlgorithm() != null)
                        existingSeason.getSeasonSettings().setRankingAlgorithm(dto.getSeasonSettings().getRankingAlgorithm());

                    var seasonDto = seasonMapper.seasonToSeasonDto(seasonRepository.save(existingSeason));

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.SEASON_UPDATE, seasonDto.getGroupId(), seasonDto));

                    return seasonDto;
                })
                .orElse(null);
    }

    public NullablePair<Group, Season> getSeasonAndGroup(String groupId, String seasonId) {
        return NullablePair.of(groupRepository.findById(groupId).orElse(null), seasonRepository.findById(seasonId).orElse(null));
    }

    public ServiceResponse<NullablePair<Group, Season>> validateSeason(String groupId, String seasonId) {
        var pair = getSeasonAndGroup(groupId, seasonId);

        if (pair.getFirst() == null) {
            return ServiceResponse.error(ErrorCodes.GROUP_NOT_FOUND);
        } else if (pair.getSecond() == null) {
            return ServiceResponse.error(ErrorCodes.SEASON_NOT_FOUND);
        } else if (!pair.getFirst().getId().equals(pair.getSecond().getGroup().getId())) {
            return ServiceResponse.error(ErrorCodes.SEASON_NOT_OF_GROUP);
        }

        return ServiceResponse.ok(pair);
    }

    public ServiceResponse<NullablePair<Group, Season>> validateActiveSeason(String groupId, String seasonId) {
        var res = validateSeason(groupId, seasonId);

        if (res.isError()) {
            return ServiceResponse.error(res.getErrorCode());
        }

        if (res.getData().getSecond().getEndDate() != null) {
            return ServiceResponse.error(ErrorCodes.SEASON_ALREADY_ENDED);
        }

        return ServiceResponse.ok(res.getData());
    }
}