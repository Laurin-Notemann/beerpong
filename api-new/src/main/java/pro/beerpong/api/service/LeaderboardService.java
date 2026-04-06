package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.leaderboard.LeaderboardDto;
import pro.beerpong.api.model.dto.matches.MatchDtoExtended;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDtoComplete;
import pro.beerpong.api.model.dto.player.PlayerDtoExtended;
import pro.beerpong.api.model.dto.player.PlayerStatisticsDto;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.util.EloAlgorithm;
import pro.beerpong.api.util.RankingAlgorithm;

import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaderboardService {
    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;

    private final MatchService matchService;

    private final RuleMoveRepository ruleMoveRepository;

    public ServiceResponse<LeaderboardDto> generateLeaderboard(GroupDto group, String scope, @Nullable String seasonId) {
        return this.generateLeaderboard(group, scope, false, seasonId);
    }

    public ServiceResponse<LeaderboardDto> generateLeaderboard(GroupDto group, String scope, boolean useOld, @Nullable String seasonId) {
        return this.generateLeaderboard(group, scope, useOld, seasonId, null);
    }

    public ServiceResponse<LeaderboardDto> generateLeaderboard(GroupDto group, String scope, boolean includeExistingStats, @Nullable String seasonId, @Nullable List<String> playerIds) {
        var contextRes = buildContext(group, scope, seasonId, playerIds);

        if (contextRes.isError()) {
            return ServiceResponse.error(contextRes.getErrorCode());
        }

        var context = contextRes.getData();

        // load all rule moves for this season
        var ruleMoves = loadRuleMoves(context.matches);

        // build player lookup: profileId -> PlayerDto
        var entries = buildPlayerEntries(context.players, scope, includeExistingStats);

        // build memberToProfile lookup
        var memberToProfile = buildMemberToProfileMap(context.matches);

        var numMatches = new AtomicInteger(0);

        context.matches().stream()
                .sorted(Comparator.comparing(MatchDtoExtended::getDate))
                .forEach(match -> processMatch(match, entries, memberToProfile, ruleMoves, numMatches));

        entries.values().forEach(p -> p.getStatistics().calculate());

        return ServiceResponse.ok(buildLeaderboardDto(entries, scope, context.startedAt(), numMatches.get(), group));
    }

    private void processMatch(MatchDtoExtended match, Map<String, PlayerDtoExtended> entries,
                              Map<String, String> memberToProfile, Map<String, RuleMove> ruleMoves,
                              AtomicInteger numMatches) {
        if (match.getTeams().size() < 2) {
            return;
        }

        numMatches.incrementAndGet();

        var blueTeamId = match.getTeams().getFirst().getId();
        var redTeamId = match.getTeams().get(1).getId();

        long blueTeamPoints = 0;
        long redTeamPoints = 0;
        String winningTeamId = null;
        var playerPoints = new HashMap<String, Long>();

        for (var team : match.getTeams()) {
            var teamMembers = match.getTeamMembers().stream()
                    .filter(tm -> tm.getTeamId().equals(team.getId()))
                    .toList();

            teamMembers.forEach(tm -> {
                var profileId = memberToProfile.get(tm.getId());
                if (profileId != null && entries.containsKey(profileId)) {
                    entries.get(profileId).getStatistics().addMatch();
                    entries.get(profileId).getStatistics().addTotalTeamSize(teamMembers.size());
                }
            });

            var teamMemberIds = teamMembers.stream().map(TeamMemberDto::getId).collect(Collectors.toSet());

            var teamMoves = match.getMatchMoves().stream()
                    .filter(mm -> teamMemberIds.contains(mm.getTeamMemberId()))
                    .toList();

            for (var move : teamMoves) {
                var profileId = memberToProfile.get(move.getTeamMemberId());
                if (profileId == null || !entries.containsKey(profileId)) continue;

                var ruleMove = ruleMoves.get(move.getMoveId());
                if (ruleMove == null) continue;

                var entry = entries.get(profileId);
                var ownPoints = ruleMove.getPointsForScorer() * move.getValue();

                entry.getStatistics().addMoves(move.getValue());
                entry.getStatistics().addPoints(ownPoints);

                if (ruleMove.getPointsForTeam() > 0) {
                    teamMembers.forEach(tm -> {
                        var pid = memberToProfile.get(tm.getId());
                        if (pid != null && entries.containsKey(pid)) {
                            entries.get(pid).getStatistics().addPoints(ruleMove.getPointsForTeam() * move.getValue());
                        }
                    });
                }

                if (ruleMove.isFinishingMove()) {
                    winningTeamId = team.getId();
                }

                playerPoints.merge(entry.getStatistics().getPlayerId(), (long) ownPoints, Long::sum);
                if (team.getId().equals(blueTeamId)) blueTeamPoints += ownPoints;
                else redTeamPoints += ownPoints;
            }
        }

        if (winningTeamId == null) {
            throw new IllegalStateException("Match " + match.getId() + " has no winning team! That is weird!");
        }

        var blueStats = getTeamStats(match, blueTeamId, memberToProfile, entries);
        var redStats = getTeamStats(match, redTeamId, memberToProfile, entries);

        String finalWinningTeamId = winningTeamId;
        (finalWinningTeamId.equals(blueTeamId) ? blueStats : redStats).forEach(PlayerStatisticsDto::addWin);

        EloAlgorithm.calculateElo(winningTeamId, blueTeamId, blueTeamPoints, redTeamPoints,
                blueStats, redStats, playerPoints);
    }

    private ServiceResponse<LeaderboardContext> buildContext(GroupDto group, String scope, @Nullable String seasonId, @Nullable List<String> playerIds) {
        return switch (scope) {
            case "all-time" -> ServiceResponse.ok((group.getActiveSeasonId() != null ? new LeaderboardContext(
                    matchService.getFullMatchesBySeasonId(group.getActiveSeasonId()),
                    matchService.getAllPlayers(group.getId(), playerIds),
                    group.getCreatedAt()) : null
            ));
            case "season" -> {
                if (seasonId == null) {
                    yield ServiceResponse.error(ErrorCodes.LEADERBOARD_SEASON_NOT_FOUND);
                }

                var season = seasonRepository.findById(seasonId).orElse(null);

                if (season == null) {
                    yield ServiceResponse.error(ErrorCodes.SEASON_NOT_FOUND);
                }

                yield ServiceResponse.ok(new LeaderboardContext(
                        matchService.getFullMatchesBySeasonId(seasonId),
                        matchService.getAllPlayersInSeason(seasonId, playerIds),
                        season.getStartDate()
                ));
            }
            case "today" -> {
                if (group.getActiveSeasonId() == null) {
                    yield ServiceResponse.error(ErrorCodes.GROUP_HAS_NO_RUNNING_SEASON);
                }

                var season = seasonRepository.findById(group.getActiveSeasonId()).orElse(null);

                if (season == null) {
                    yield ServiceResponse.error(ErrorCodes.GROUP_HAS_NO_RUNNING_SEASON);
                }

                var since = switch (season.getSeasonSettings().getDailyLeaderboard()) {
                    case LAST_24_HOURS -> ZonedDateTime.now().minusHours(24);
                    case RESET_AT_MIDNIGHT -> ZonedDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
                    case WAKE_TIME -> matchService.getWakeTime(ZonedDateTime.now(), season.getSeasonSettings().getWakeTime());
                };

                yield ServiceResponse.ok(new LeaderboardContext(
                        matchService.getFullMatchesSince(season.getId(), since),
                        matchService.getAllPlayersInSeason(season.getId(), playerIds),
                        season.getStartDate()
                ));
            }
            default -> ServiceResponse.error(ErrorCodes.LEADERBOARD_SCOPE_NOT_FOUND);
        };
    }

    private Map<String, RuleMove> loadRuleMoves(List<MatchDtoExtended> matches) {
        var moveIds = matches.stream()
                .flatMap(m -> m.getMatchMoves().stream())
                .map(MatchMoveDtoComplete::getMoveId)
                .distinct()
                .toList();

        return ruleMoveRepository.findAllById(moveIds).stream()
                .collect(Collectors.toMap(RuleMove::getId, r -> r));
    }

    private Map<String, String> buildMemberToProfileMap(List<MatchDtoExtended> matches) {
        var playerIds = matches.stream()
                .flatMap(m -> m.getTeamMembers().stream())
                .map(TeamMemberDto::getPlayerId)
                .distinct()
                .toList();
        var players = playerRepository.findAllById(playerIds).stream()
                .collect(Collectors.toMap(Player::getId, player -> player.getProfile().getId()));
        var memberToProfile = new HashMap<String, String>();

        matches.stream()
                .flatMap(m -> m.getTeamMembers().stream())
                .forEach(tm -> {
                    var profileId = players.get(tm.getPlayerId());
                    if (profileId != null) {
                        memberToProfile.put(tm.getId(), profileId);
                    }
                });

        return memberToProfile;
    }

    private Map<String, PlayerDtoExtended> buildPlayerEntries(List<PlayerDtoExtended> players, String scope, boolean includeExistingStats) {
        Map<String, PlayerDtoExtended> entries = new HashMap<>();

        players.forEach(playerDto -> {
            var existing = entries.get(playerDto.getProfileId());

            if (existing == null || isNewerPlayer(playerDto, existing)) {
                if ((!scope.equals("all-time") && !includeExistingStats) || playerDto.getStatistics() == null) {
                    playerDto.setStatistics(new PlayerStatisticsDto());
                }
                playerDto.getStatistics().setId(null);
                playerDto.getStatistics().setPlayerId(playerDto.getId());
                entries.put(playerDto.getProfileId(), playerDto);
            }
        });

        return entries;
    }

    private List<PlayerStatisticsDto> getTeamStats(MatchDtoExtended match, String teamId,
                                                   Map<String, String> memberToProfile,
                                                   Map<String, PlayerDtoExtended> entries) {
        return match.getTeamMembers().stream()
                .filter(tm -> tm.getTeamId().equals(teamId))
                .map(tm -> memberToProfile.get(tm.getId()))
                .filter(pid -> pid != null && entries.containsKey(pid))
                .map(pid -> entries.get(pid).getStatistics())
                .toList();
    }

    private boolean isNewerPlayer(PlayerDtoExtended candidate, PlayerDtoExtended existing) {
        // spieler der aktiven season sind automatisch die neusten
        if (candidate.getSeason().getId() == null) {
            return true;
        }

        // ebenso is der zu überprüfende spieler automatisch älter als der aktuelle spieler, wenn dieser aus der aktuellen season ist
        if (existing.getSeason().getEndDate() == null) {
            return false;
        }

        return candidate.getSeason().getEndDate().isAfter(existing.getSeason().getEndDate());
    }

    private LeaderboardDto buildLeaderboardDto(Map<String, PlayerDtoExtended> entries,
                                               String scope,
                                               ZonedDateTime startedAt,
                                               int numMatches,
                                               GroupDto group) {
        var dto = new LeaderboardDto();
        dto.setEntries(entries.values().stream()
                .filter(p -> scope.equals("all-time") || p.isActiveThisSeason())
                .toList());
        dto.setStartedAt(startedAt);
        dto.setNumMatches(numMatches + (scope.equals("all-time") ? matchService.numOfMatchesInPastSeasons(group.getId()) : 0L));
        dto.setNumPlayers(dto.getEntries().size());

        for (var algo : RankingAlgorithm.values()) {
            var ranking = new AtomicInteger();

            dto.getEntries().stream()
                    .sorted(getRankingComparator(algo))
                    .forEach(entry -> entry.getStatistics().getRankBy().put(algo, ranking.incrementAndGet()));
        }

        return dto;
    }

    private Comparator<PlayerDtoExtended> getRankingComparator(RankingAlgorithm algo) {
        return switch (algo) {
            case AVERAGE -> (a, b) -> Double.compare(b.getStatistics().getAvgPointsPerMatch(), a.getStatistics().getAvgPointsPerMatch());
            case ELO -> (a, b) -> Double.compare(b.getStatistics().getElo(), a.getStatistics().getElo());
        };
    }

    private record LeaderboardContext(List<MatchDtoExtended> matches, List<PlayerDtoExtended> players,
                                      ZonedDateTime startedAt) {
    }
}