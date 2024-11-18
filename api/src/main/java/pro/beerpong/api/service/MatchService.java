package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.MatchMapper;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MatchService {
    private final SubscriptionHandler subscriptionHandler;

    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final GroupRepository groupRepository; // new field
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchMoveRepository matchMoveRepository;
    private final RuleMoveRepository ruleMoveRepository;

    private final TeamService teamService;
    private final MatchMapper matchMapper;

    @Autowired
    public MatchService(SubscriptionHandler subscriptionHandler,
                        MatchRepository matchRepository,
                        SeasonRepository seasonRepository,
                        PlayerRepository playerRepository,
                        GroupRepository groupRepository,
                        TeamRepository teamRepository,
                        TeamMemberRepository teamMemberRepository,
                        MatchMoveRepository matchMoveRepository,
                        RuleMoveRepository ruleMoveRepository,
                        TeamService teamService,
                        MatchMapper matchMapper) {
        this.subscriptionHandler = subscriptionHandler;

        this.matchRepository = matchRepository;
        this.seasonRepository = seasonRepository;
        this.playerRepository = playerRepository;
        this.groupRepository = groupRepository;
        this.teamRepository = teamRepository;
        this.matchMoveRepository = matchMoveRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.ruleMoveRepository = ruleMoveRepository;

        this.teamService = teamService;
        this.matchMapper = matchMapper;
    }

    private boolean validateCreateDto(String groupId, String seasonId, MatchCreateDto dto) {
        return dto.getTeams().stream().allMatch(teamCreateDto ->
                teamCreateDto.getTeamMembers().stream().allMatch(memberDto -> {
                    var player = playerRepository.findById(memberDto.getPlayerId());

                    if (player.isEmpty() || !player.get().getSeason().getId().equals(seasonId) || !player.get().getSeason().getGroupId().equals(groupId)) {
                        return false;
                    }

                    return memberDto.getMoves().stream().allMatch(matchMoveDto -> {
                        var move = ruleMoveRepository.findById(matchMoveDto.getMoveId());

                        return move.isPresent() && move.get().getSeason().getId().equals(seasonId) && move.get().getSeason().getGroupId().equals(groupId);
                    });
                }));
    }

    @Transactional
    public MatchDto createNewMatch(@NotNull Group group, @NotNull Season season, MatchCreateDto matchCreateDto) {
        if (!group.getActiveSeason().getId().equals(season.getId()) ||
                !validateCreateDto(group.getId(), season.getId(), matchCreateDto)) {
            return null;
        }

        var match = new Match();

        match.setDate(ZonedDateTime.now());
        match.setSeason(season);

        match = matchRepository.save(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        var dto = matchMapper.matchToMatchDto(match);

        if (dto.getSeason().getGroupId().equals(group.getId())) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_CREATE, group.getId(), dto));
        }

        return dto;
    }

    public MatchDto updateMatch(Group group, Match match, MatchCreateDto matchCreateDto) {
        if (match == null || matchCreateDto == null || group == null) {
            return null;
        }

        // Step 1: Find all teams associated with the match
        List<Team> teams = teamRepository.findAllByMatchId(match.getId());

        // Step 2: Loop through each team
        for (Team team : teams) {
            String teamId = team.getId();

            // Step 3: Find all team members associated with the team

            List<TeamMember> teamMembers = teamMemberRepository.findAllByTeamId(teamId);

            // Step 4: Loop through each team member
            for (TeamMember teamMember : teamMembers) {
                String teamMemberId = teamMember.getId();

                // Step 5: Find all match moves associated with the team member
                List<MatchMove> matchMoves = matchMoveRepository.findAllByTeamMemberId(teamMemberId);

                // Step 6: Delete all match moves
                matchMoveRepository.deleteAll(matchMoves);
            }

            // Step 7: Delete all team members
            teamMemberRepository.deleteAll(teamMembers);
        }

        // Step 8: Delete all teams
        teamRepository.deleteAll(teams);

        MatchDto updatedDto = matchMapper.matchToMatchDto(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, group.getId(), updatedDto));

        return updatedDto;

    }

    public List<MatchDto> getAllMatches(String seasonId) {
        return matchRepository.findBySeasonId(seasonId)
                .stream()
                .map(matchMapper::matchToMatchDto)
                .toList();
    }

    public MatchDto getMatchById(String id) {
        return matchRepository.findById(id)
                .map(matchMapper::matchToMatchDto)
                .orElse(null);
    }

    public Match getRawMatchById(String id) {
        return matchRepository.findById(id).orElse(null);
    }
}