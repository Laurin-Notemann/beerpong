package pro.beerpong.api.service;

import com.google.api.client.util.Lists;
import com.google.common.collect.Maps;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Comparator;
import java.util.Map;
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

    @Autowired
    public LeaderboardService(RuleMoveService ruleMoveService, MatchService matchService, PlayerRepository playerRepository) {
        this.ruleMoveService = ruleMoveService;
        this.matchService = matchService;
        this.playerRepository = playerRepository;
    }

    public LeaderboardDto generateLeaderboard(GroupDto group, String scope, @Nullable String seasonId) {
        Stream<MatchDto> matches;
        Stream<PlayerDto> players;

        switch (scope) {
            case "all-time" -> {
                matches = matchService.streamAllMatches(group);
                players = matchService.streamAllPlayers(group);
            }
            case "season" -> {
                if (seasonId == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesInSeason(seasonId);
                players = matchService.streamAllPlayersInSeason(seasonId);
            }
            case "today" -> {
                var season = group.getActiveSeason();

                if (season == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesToday(group, season);
                players = matchService.streamAllPlayersInSeason(season.getId());
            }
            default -> {
                matches = Stream.of();
                players = Stream.of();
            }
        }

        Map<String, LeaderboardEntryDto> entries = Maps.newHashMap();
        Map<String, String> memberToProfile = Maps.newHashMap();

        players.forEach(playerDto -> {
            var dto = new LeaderboardEntryDto();

            //TODO change to profileId
            dto.setPlayerId(playerDto.getId());

            entries.put(playerDto.getProfile().getId(), dto);
        });

        // go through all matches sorted by date, starting with the earliest
        matches.sorted(Comparator.comparing(MatchDto::getDate)).forEach(matchDto -> {
            if (matchDto.getTeams().size() < 2) {
                return;
            }

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
                    entries.get(profileId).addTotalGames();
                    entries.get(profileId).addTotalTeamSize(teamMembers.size());
                });

                AtomicInteger teamPoints = new AtomicInteger();
                Map<String, Integer> pointsPerPlayer = Maps.newHashMap();

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

                            // save points for player and points for team to calculate activity
                            // here we don't include the pointsForTeam because everybody in the team receives those
                            pointsPerPlayer.put(dto.getTeamMemberId(), pointsPerPlayer.getOrDefault(dto.getTeamMemberId(), 0) +
                                    (points.getFirst() * dto.getValue()));
                            // add points to teamPoints if they are not a move that gains the whole team points
                            // to reward the player that made the move, without punishing his members for this,
                            // we don't add those points here but to the players points
                            teamPoints.addAndGet((points.getSecond() == 0 ? points.getFirst() * dto.getValue() : 0));

                            // add total moves and gained points to the scorers entry
                            entry.addTotalMoves(dto.getValue());
                            entry.addTotalPoints(points.getFirst() * dto.getValue());

                            // if pointsForTeam > 0 add gained pointsForTeam to every team members entry
                            if (points.getSecond() > 0) {
                                teamMembers.forEach(teamMemberDto -> {
                                    if (memberToProfile.containsKey(teamMemberDto.getId())) {
                                        var profileId = memberToProfile.get(teamMemberDto.getId());

                                        if (entries.containsKey(profileId)) {
                                            entries.get(profileId).addTotalPoints(points.getSecond() * dto.getValue());
                                        }
                                    }
                                });
                            }
                        });

                // clear team member cache
                teamMembers.clear();
            });

            // find the move that ended the game -> to find the winning team
            var winningMove = matchDto.getMatchMoves().stream()
                    .filter(dtoComplete -> ruleMoveService.isFinish(dtoComplete.getMoveId()))
                    .findFirst()
                    .orElse(null);

            if (winningMove == null) {
                // no winning move? weird...
                return;
            }

            var winningPlayer = matchDto.getTeamMembers().stream()
                    .filter(teamMemberDto -> teamMemberDto.getId().equals(winningMove.getTeamMemberId()))
                    .findFirst()
                    .orElse(null);

            if (winningPlayer == null) {
                // no winning player? weird...
                return;
            }

            var winningTeam = (winningPlayer.getTeamId().equals(matchDto.getTeams().getFirst().getId()) ? matchDto.getTeams().getFirst() : matchDto.getTeams().get(1));
            var loosingTeam = matchDto.getTeams().getFirst().getId().equals(winningTeam.getId()) ? matchDto.getTeams().get(1) : matchDto.getTeams().getFirst();

            // calculate team elo averages
            var winnerEloAvg = calcTeamEloAverage(entries, memberToProfile, matchDto, winningTeam);
            var looserEloAvg = calcTeamEloAverage(entries, memberToProfile, matchDto, loosingTeam);

            // calculate elo for all team members
            matchDto.getTeamMembers().forEach(teamMemberDto -> {
                if (!memberToProfile.containsKey(teamMemberDto.getId())) {
                    return;
                }

                var entry = entries.get(memberToProfile.get(teamMemberDto.getId()));

                // win: 1.0, loss: 0.0, no draw possible
                var score = teamMemberDto.getTeamId().equals(winningTeam.getId()) ? 1.0D : 0.0D;
                var oppenentElo = teamMemberDto.getTeamId().equals(winningTeam.getId()) ? looserEloAvg : winnerEloAvg;

                // calculate elo (source: https://www.omnicalculator.com/sports/elo#what-is-the-elo-rating-system)
                entry.setElo(entry.getElo() + K_FACTOR * (score - expectedScore(entry.getElo(), oppenentElo)));
            });
        });

        // calculate averages for all entries
        entries.values().forEach(LeaderboardEntryDto::calculate);

        // create dto and set entries
        var dto = new LeaderboardDto();
        dto.setEntries(Lists.newArrayList(entries.values()));

        // calculate ranking for all possible algorithms
        for (RankingAlgorithm value : RankingAlgorithm.values()) {
            var ranking = new AtomicInteger();

            var stream = dto.getEntries().stream();

            // sort the stream based on the current algorithm
            switch (value) {
                case AVERAGE -> stream = stream.sorted((o1, o2) -> Double.compare(o2.getAveragePointsPerMatch(), o1.getAveragePointsPerMatch()));
                case ELO -> stream = stream.sorted((o1, o2) -> Double.compare(o2.getElo(), o1.getElo()));
            }

            // set ranking for current algorithm
            stream.forEach(entry -> entry.getRankBy().put(value, ranking.incrementAndGet()));
        }

        // clear entries
        entries.clear();

        return dto;
    }

    private double calcTeamEloAverage(Map<String, LeaderboardEntryDto> entries, Map<String, String> memberToProfile, MatchDto matchDto, TeamDto teamDto) {
        return matchDto.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(teamDto.getId()) &&
                        memberToProfile.containsKey(teamMemberDto.getId()) &&
                        entries.containsKey(memberToProfile.get(teamMemberDto.getId())))
                .map(teamMemberDto -> entries.get(memberToProfile.get(teamMemberDto.getId())).getElo())
                .reduce(Double::sum)
                .orElse(0D) /
                matchDto.getTeamMembers().stream()
                        .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(teamDto.getId()))
                        .count();
    }

    private double expectedScore(double elo1, double elo2) {
        return 1.0 / (1 + Math.pow(10, (elo2 - elo1) / ELO_DIVIDER));
    }
}