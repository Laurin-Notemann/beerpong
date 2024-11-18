package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.time.ZonedDateTime;
import java.util.List;

@Service
public class MatchService {
    private final SubscriptionHandler subscriptionHandler;

    private final MatchRepository matchRepository;
    private final TeamMemberService teamMemberService;
    private final PlayerRepository playerRepository;
    private final MatchMoveService matchMoveService; // new field
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchMoveRepository matchMoveRepository;
    private final RuleMoveRepository ruleMoveRepository;

    private final TeamService teamService;

    @Autowired
    public MatchService(SubscriptionHandler subscriptionHandler,
                        MatchRepository matchRepository,
                        TeamMemberService teamMemberService,
                        PlayerRepository playerRepository,
                        MatchMoveService matchMoveService,
                        TeamRepository teamRepository,
                        TeamMemberRepository teamMemberRepository,
                        MatchMoveRepository matchMoveRepository,
                        RuleMoveRepository ruleMoveRepository,
                        TeamService teamService) {
        this.subscriptionHandler = subscriptionHandler;

        this.matchRepository = matchRepository;
        this.teamMemberService = teamMemberService;
        this.playerRepository = playerRepository;
        this.matchMoveService = matchMoveService;
        this.teamRepository = teamRepository;
        this.matchMoveRepository = matchMoveRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.ruleMoveRepository = ruleMoveRepository;

        this.teamService = teamService;
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

        var dto = matchToMatchDto(match);

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

        MatchDto updatedDto = matchToEmptyMatchDto(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        loadMatchInfo(match, updatedDto);

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, group.getId(), updatedDto));

        return updatedDto;

    }

    public List<MatchDto> getAllMatches(String seasonId) {
        return matchRepository.findBySeasonId(seasonId)
                .stream()
                .map(this::matchToMatchDto)
                .toList();
    }

    public MatchDto getMatchById(String id) {
        return matchRepository.findById(id)
                .map(this::matchToMatchDto)
                .orElse(null);
    }

    public Match getRawMatchById(String id) {
        return matchRepository.findById(id).orElse(null);
    }

    private MatchDto matchToEmptyMatchDto(Match match) {
        var dto = new MatchDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeason(match.getSeason());

        return dto;
    }

    private MatchDto matchToMatchDto(Match match) {
        var dto = new MatchDto();

        dto.setId(match.getId());
        dto.setDate(match.getDate());
        dto.setSeason(match.getSeason());

        loadMatchInfo(match, dto);

        return dto;
    }

    private void loadMatchInfo(Match match, MatchDto dto) {
        var teams = teamService.buildTeamDtos(match);
        dto.setTeams(teams);

        var teamMembers = teamMemberService.buildTeamMemberDtos(teams);
        dto.setTeamMembers(teamMembers);

        dto.setMatchMoves(matchMoveService.buildMatchMoveDtos(teamMembers));
    }
}