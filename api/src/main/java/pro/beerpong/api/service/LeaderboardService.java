package pro.beerpong.api.service;

import com.google.api.client.util.Lists;
import com.google.common.collect.Maps;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dto.GroupDto;
import pro.beerpong.api.model.dto.LeaderboardDto;
import pro.beerpong.api.model.dto.LeaderboardEntryDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class LeaderboardService {
    private final RuleMoveService ruleMoveService;
    private final MatchService matchService;

    @Autowired
    public LeaderboardService(RuleMoveService ruleMoveService, MatchService matchService) {
        this.ruleMoveService = ruleMoveService;
        this.matchService = matchService;
    }

    public LeaderboardDto generateLeaderboard(GroupDto group, String scope, @Nullable String seasonId) {
        Stream<MatchDto> matches;

        switch (scope) {
            case "all-time" -> matches = matchService.streamAllMatches(group);
            case "season" -> {
                if (seasonId == null) {
                    return null;
                }

                matches = matchService.streamAllMatchesInSeason(seasonId);
            }
            case "daily" -> matches = matchService.streamAllMatchesToday(group);
            default -> matches = Stream.of();
        }

        Map<String, LeaderboardEntryDto> entries = Maps.newHashMap();

        // go through all matches and all teams
        matches.forEach(matchDto -> matchDto.getTeams().forEach(teamDto -> {
            // collect team members
            var teamMembers = matchDto.getTeamMembers().stream()
                    .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(teamDto.getId()))
                    .collect(Collectors.toCollection(Lists::newArrayList));

            // go through all team members
            teamMembers.forEach(teamMemberDto -> {
                // create leaderboard entries for all members
                if (!entries.containsKey(teamMemberDto.getId())) {
                    var dto = new LeaderboardEntryDto();

                    dto.setPlayerId(teamMemberDto.getPlayerId());

                    entries.put(teamMemberDto.getId(), dto);
                }

                // add game and team size to entry
                entries.get(teamMemberDto.getId()).addTotalGames();
                entries.get(teamMemberDto.getId()).addTotalTeamSize(teamMembers.size());
            });

            AtomicInteger teamPoints = new AtomicInteger();
            Map<String, Integer> pointsPerPlayer = Maps.newHashMap();

            // go through all moves made by this team
            matchDto.getMatchMoves().stream()
                    .filter(dto -> teamMembers.stream().anyMatch(teamMemberDto -> teamMemberDto.getId().equals(dto.getTeamMemberId())))
                    .forEach(dto -> {
                        if (!entries.containsKey(dto.getTeamMemberId())) {
                            return;
                        }

                        // get entry and points for this move
                        var entry = entries.get(dto.getTeamMemberId());
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
                                if (entries.containsKey(teamMemberDto.getId())) {
                                    entries.get(teamMemberDto.getId()).addTotalPoints(points.getSecond() * dto.getValue());
                                }
                            });
                        }
                    });

            // calculate stats for all members
            teamMembers.forEach(teamMemberDto -> {
                if (entries.containsKey(teamMemberDto.getId())) {
                    return;
                }

                // get points the player made and points the team made
                var playerPoints = pointsPerPlayer.getOrDefault(teamMemberDto.getId(), 0);
                var teamSize = teamMembers.size();

                // calculate the activity of the player based on the ratio of player points to team points
                double activityWeight = (double) playerPoints / teamPoints.get();
                // normalize the amount of points the player made
                double normalizedScore = (playerPoints / (double) teamSize) * activityWeight;

                // add normalized score to players score
                entries.get(teamMemberDto.getId()).addElo(normalizedScore);
            });

            // clear team member cache
            teamMembers.clear();
        }));

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
                case AVERAGE -> stream = stream.sorted(Comparator.comparing(LeaderboardEntryDto::getAveragePointsPerMatch));
                case ELO -> stream = stream.sorted(Comparator.comparing(LeaderboardEntryDto::getElo));
            }

            // set ranking for current algorithm
            stream.forEach(entry -> entry.getRankBy().put(value, ranking.incrementAndGet()));
        }

        // clear entries
        entries.clear();

        return dto;
    }
}