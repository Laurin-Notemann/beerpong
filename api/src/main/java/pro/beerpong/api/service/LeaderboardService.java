package pro.beerpong.api.service;

import com.google.api.client.util.Lists;
import com.google.common.collect.Maps;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.SeasonMapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.EloAlgorithm;
import pro.beerpong.api.util.RankingAlgorithm;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class LeaderboardService {
    private static final double K_FACTOR = 10D;
    private static final int ELO_DIVIDER = 400;

    private final RuleMoveService ruleMoveService;
    private final MatchService matchService;
    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final SeasonMapper seasonMapper;

    @Autowired
    public LeaderboardService(RuleMoveService ruleMoveService, MatchService matchService, PlayerRepository playerRepository, SeasonRepository seasonRepository, SeasonMapper seasonMapper) {
        this.ruleMoveService = ruleMoveService;
        this.matchService = matchService;
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.seasonMapper = seasonMapper;
    }

    public LeaderboardDto generateLeaderboard(GroupDto group, String scope, @Nullable String seasonId) {
        return this.generateLeaderboard(group, scope, false, seasonId);
    }

    public LeaderboardDto generateLeaderboard(GroupDto group, String scope, boolean useOld, @Nullable String seasonId) {
        return this.generateLeaderboard(group, scope, useOld, seasonId, null);
    }

    public LeaderboardDto generateLeaderboard(GroupDto group, String scope, boolean useOld, @Nullable String seasonId, @Nullable Stream<PlayerDto> players) {
        Stream<MatchDto> matches;
        ZonedDateTime startedAt;

        switch (scope) {
            case "all-time" -> {
                if (group.getActiveSeason() == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesInSeason(group.getActiveSeason().getId());

                if (players == null) {
                    players = matchService.streamAllPlayers(group);
                }

                startedAt = group.getCreatedAt();
            }
            case "season" -> {
                if (seasonId == null) {
                    return null;
                }

                var season = seasonRepository.findById(seasonId)
                        .map(seasonMapper::seasonToSeasonDto)
                        .orElse(null);

                if (season == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesInSeason(seasonId);

                if (players == null) {
                    players = matchService.streamAllPlayersInSeason(seasonId);
                }

                startedAt = season.getStartDate();
            }
            case "today" -> {
                var season = group.getActiveSeason();

                if (season == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesToday(group, season);

                if (players == null) {
                    players = matchService.streamAllPlayersInSeason(season.getId());
                }

                if (season.getSeasonSettings().getDailyLeaderboard() == DailyLeaderboard.LAST_24_HOURS) {
                    startedAt = ZonedDateTime.now().minusHours(24);
                } else if (season.getSeasonSettings().getDailyLeaderboard() == DailyLeaderboard.RESET_AT_MIDNIGHT) {
                    startedAt = ZonedDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
                } else {
                    startedAt = matchService.getWakeTime(ZonedDateTime.now(), season.getSeasonSettings().getWakeTimeHour());
                }
            }
            default -> {
                matches = Stream.of();

                if (players == null) {
                    players = Stream.of();
                }

                startedAt = ZonedDateTime.now();
            }
        }

        Map<String, PlayerDto> entries = Maps.newHashMap();
        Map<String, String> memberToProfile = Maps.newHashMap();

        AtomicInteger numMatches = new AtomicInteger(0);

        // create dtos for all players
        players.forEach(playerDto -> {
            var dto = entries.get(playerDto.getProfile().getId());

            // we always want to use the newest player of a profile (the player that played in the most recent season)
            // if no player is saved we set the player...
            if (dto == null ||
                    // or if the current player is from the active season we set him...
                    playerDto.getSeason().getEndDate() == null ||
                    // or if the season of the current player is closer to now than the season of the player saved in the map we set the current player
                    dto.getSeason().getEndDate() != null && Duration.between(
                                    ZonedDateTime.now(), playerDto.getSeason().getEndDate())
                            .compareTo(Duration.between(
                                    ZonedDateTime.now(), dto.getSeason().getEndDate()
                            )) < 0) {
                if ((!scope.equals("all-time") && !useOld) || playerDto.getStatistics() == null) {
                    playerDto.setStatistics(new PlayerStatisticsDto());
                }

                playerDto.getStatistics().setId(null);
                entries.put(playerDto.getProfile().getId(), playerDto);
            }
        });

        // go through all matches sorted by date, starting with the earliest
        matches.sorted(Comparator.comparing(MatchDto::getDate)).forEach(matchDto -> {
            if (matchDto.getTeams().size() < 2) {
                return;
            }

            // increment the player count
            numMatches.incrementAndGet();

            // go through all teams
            matchDto.getTeams().forEach(teamDto -> {
                // collect team members
                var teamMembers = matchDto.getTeamMembers().stream()
                        .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(teamDto.getId()))
                        .collect(Collectors.toCollection(Lists::newArrayList));

                // go through all team members
                teamMembers.forEach(teamMemberDto -> {
                    // save player id by member id
                    if (!memberToProfile.containsKey(teamMemberDto.getId())) {
                        var player = playerRepository.findById(teamMemberDto.getPlayerId()).orElse(null);

                        if (player == null) {
                            return;
                        }

                        memberToProfile.put(teamMemberDto.getId(), player.getProfile().getId());
                    }

                    var profileId = memberToProfile.get(teamMemberDto.getId());

                    // add game and team size to entry
                    entries.get(profileId).getStatistics().addMatch();
                    entries.get(profileId).getStatistics().addTotalTeamSize(teamMembers.size());
                });

                // go through all moves made by this team
                matchDto.getMatchMoves().stream()
                        .filter(dto -> teamMembers.stream().anyMatch(teamMemberDto -> teamMemberDto.getId().equals(dto.getTeamMemberId())))
                        .forEach(dto -> {
                            if (!memberToProfile.containsKey(dto.getTeamMemberId()) ||
                                    !entries.containsKey(memberToProfile.get(dto.getTeamMemberId()))) {
                                return;
                            }

                            // get entry and points for this move
                            var entry = entries.get(memberToProfile.get(dto.getTeamMemberId()));
                            var points = ruleMoveService.getPointsById(dto.getMoveId());

                            if (points == null) {
                                return;
                            }

                            // add total moves and gained points to the scorers entry
                            entry.getStatistics().addMoves(dto.getValue());
                            entry.getStatistics().addPoints(points.getFirst() * dto.getValue());

                            // if pointsForTeam > 0 add gained pointsForTeam to every team members entry
                            if (points.getSecond() > 0) {
                                teamMembers.forEach(teamMemberDto -> {
                                    if (memberToProfile.containsKey(teamMemberDto.getId())) {
                                        var profileId = memberToProfile.get(teamMemberDto.getId());

                                        if (entries.containsKey(profileId)) {
                                            entries.get(profileId).getStatistics().addPoints(points.getSecond() * dto.getValue());
                                        }
                                    }
                                });
                            }
                        });

                // clear members cache
                teamMembers.clear();
            });

            var blueTeamId = matchDto.getTeams().getFirst().getId();
            var redTeamId = matchDto.getTeams().get(1).getId();

            var blueTeamMembers = matchDto.getTeamMembers().stream()
                    .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(blueTeamId) &&
                            memberToProfile.containsKey(teamMemberDto.getId()) &&
                            entries.containsKey(memberToProfile.get(teamMemberDto.getId())))
                    .toList();
            var blueTeamMemberStatistics = blueTeamMembers.stream()
                    .map(teamMemberDto -> entries.get(memberToProfile.get(teamMemberDto.getId())).getStatistics())
                    .toList();

            var redTeamMembers = matchDto.getTeamMembers().stream()
                    .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(redTeamId) &&
                            memberToProfile.containsKey(teamMemberDto.getId()) &&
                            entries.containsKey(memberToProfile.get(teamMemberDto.getId())))
                    .toList();
            var redTeamMemberStatistics = redTeamMembers.stream()
                    .map(teamMemberDto -> entries.get(memberToProfile.get(teamMemberDto.getId())).getStatistics())
                    .toList();

            // calculate elo for both teams
            EloAlgorithm.calculateElo(blueTeamMemberStatistics, redTeamMemberStatistics);
        });

        // calculate averages for all entries
        entries.values().forEach(playerDto -> playerDto.getStatistics().calculate());

        // create dto and set entries
        var dto = new LeaderboardDto();
        dto.setEntries(entries.values().stream()
                .filter(playerDto -> scope.equals("all-time") || playerDto.isActiveThisSeason())
                .toList());
        dto.setStartedAt(startedAt);
        dto.setNumMatches(numMatches.get() + (scope.equals("all-time") ? matchService.numOfMatchesInPastSeasons(group) : 0L));
        dto.setNumPlayers(dto.getEntries().size());

        // calculate ranking for all possible algorithms
        for (RankingAlgorithm value : RankingAlgorithm.values()) {
            var ranking = new AtomicInteger();

            var stream = dto.getEntries().stream();

            // sort the stream based on the current algorithm
            switch (value) {
                case AVERAGE ->
                        stream = stream.sorted((o1, o2) -> Double.compare(o2.getStatistics().getAvgPointsPerMatch(),
                                o1.getStatistics().getAvgPointsPerMatch()));
                case ELO -> stream = stream.sorted((o1, o2) -> Double.compare(o2.getStatistics().getElo(), o1.getStatistics().getElo()));
            }

            // set ranking for current algorithm
            stream.forEach(entry -> entry.getStatistics().getRankBy().put(value, ranking.incrementAndGet()));
        }

        // clear caches
        entries.clear();
        memberToProfile.clear();

        return dto;
    }
}