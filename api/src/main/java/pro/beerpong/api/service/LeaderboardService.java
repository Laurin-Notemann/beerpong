package pro.beerpong.api.service;

import com.google.api.client.util.Lists;
import com.google.common.collect.Maps;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.util.RankingAlgorithm;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class LeaderboardService {
    private final RuleMoveService ruleMoveService;
    private final MatchService matchService;

    private static final double CONTRIBUTION_WEIGHT = 5.0D;
    private static final double TEAM_IMPACT_WEIGHT = 0.3D;
    private static final double PLAYER_IMPACT_WEIGHT = 0.3D;
    private static final double EFFICIENCY_WEIGHT = 0.3D;
    private static final double TEAM_SIZE_WEIGHT = 0.2D;

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
            //TODO use season setting
            case "today" -> matches = matchService.streamAllMatchesToday(group);
            default -> matches = Stream.of();
        }

        Map<String, LeaderboardEntryDto> entries = Maps.newHashMap();
        Map<String, String> memberToPlayer = Maps.newHashMap();

        //TODO create entries for all player in current season, provided season or all time

        // go through all matches and all teams
        matches.forEach(matchDto -> matchDto.getTeams().forEach(teamDto -> {
            // collect team members
            var teamMembers = matchDto.getTeamMembers().stream()
                    .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(teamDto.getId()))
                    .collect(Collectors.toCollection(Lists::newArrayList));

            // go through all team members
            teamMembers.forEach(teamMemberDto -> {
                // create leaderboard entries for all members
                if (!entries.containsKey(teamMemberDto.getPlayerId())) {
                    var dto = new LeaderboardEntryDto();

                    dto.setPlayerId(teamMemberDto.getPlayerId());

                    entries.put(teamMemberDto.getPlayerId(), dto);
                }

                // save player id by member id
                if (!memberToPlayer.containsKey(teamMemberDto.getTeamId())) {
                    memberToPlayer.put(teamMemberDto.getId(), teamMemberDto.getPlayerId());
                }

                // add game and team size to entry
                entries.get(teamMemberDto.getPlayerId()).addTotalGames();
                entries.get(teamMemberDto.getPlayerId()).addTotalTeamSize(teamMembers.size());
            });

            AtomicInteger teamPoints = new AtomicInteger();
            Map<String, Integer> pointsPerPlayer = Maps.newHashMap();

            // go through all moves made by this team
            matchDto.getMatchMoves().stream()
                    .filter(dto -> teamMembers.stream().anyMatch(teamMemberDto -> teamMemberDto.getId().equals(dto.getTeamMemberId())))
                    .forEach(dto -> {
                        if (!memberToPlayer.containsKey(dto.getTeamMemberId()) ||
                                !entries.containsKey(memberToPlayer.get(dto.getTeamMemberId()))) {
                            return;
                        }

                        // get entry and points for this move
                        var entry = entries.get(memberToPlayer.get(dto.getTeamMemberId()));
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
                                if (entries.containsKey(teamMemberDto.getPlayerId())) {
                                    entries.get(teamMemberDto.getPlayerId()).addTotalPoints(points.getSecond() * dto.getValue());
                                }
                            });
                        }
                    });

            // calculate stats for all members
            teamMembers.forEach(teamMemberDto -> {
                if (!entries.containsKey(teamMemberDto.getPlayerId())) {
                    return;
                }

                var entry = entries.get(teamMemberDto.getPlayerId());

                // get points the player made and points the team made
                var playerPoints = pointsPerPlayer.getOrDefault(teamMemberDto.getId(), 0);
                var teamSize = teamMembers.size();

                // how many of the teams points the player made
                double contributionRatio  = (double) playerPoints / teamPoints.get();

                // how many points the player made per move
                double pointsPerMove = (double) playerPoints / matchDto.getMatchMoves().stream()
                        .filter(dtoComplete -> dtoComplete.getTeamMemberId().equals(teamMemberDto.getId()))
                        .map(MatchMoveDtoComplete::getValue)
                        .reduce(Integer::sum)
                        .orElse(playerPoints);

                // reward larger teams
                double teamSizeFactor = 1.0 / teamSize;

                // reward higher amounts of team points
                double impactOfTeam = Math.log(teamPoints.get() + 1);

                // reward higher amounts of player points
                double impactOnTeam = Math.log(playerPoints + 1);

                // calculate weighted elo
                double elo = (CONTRIBUTION_WEIGHT * contributionRatio) +
                        (EFFICIENCY_WEIGHT * pointsPerMove) +
                        (TEAM_SIZE_WEIGHT * teamSizeFactor) +
                        (TEAM_IMPACT_WEIGHT * impactOfTeam) //+
                        //(PLAYER_IMPACT_WEIGHT * impactOnTeam)
                        ;

                // add normalized score to players score
                entry.addElo(elo);
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
}