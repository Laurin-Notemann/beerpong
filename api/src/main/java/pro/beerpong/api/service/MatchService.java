package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.util.Pair;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.MatchMapper;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.*;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;
import pro.beerpong.api.util.NullablePair;

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

    private boolean validateCreateDto(MatchCreateDto dto) {
        return dto.getTeams().stream().allMatch(teamCreateDto ->
                teamCreateDto.getTeamMembers().stream().allMatch(memberDto ->
                        playerRepository.existsById(memberDto.getPlayerId()) &&
                                memberDto.getMoves().stream().allMatch(matchMoveDto ->
                                        ruleMoveRepository.existsById(matchMoveDto.getMoveId()))));
    }

    public NullablePair<Group, Season> getSeasonAndGroup(String groupId, String seasonId) {
        return NullablePair.of(groupRepository.findById(groupId).orElse(null), seasonRepository.findById(seasonId).orElse(null));
    }

    @Transactional
    public MatchDto createNewMatch(@NotNull Group group, @NotNull Season season, MatchCreateDto matchCreateDto) {
        if (!group.getActiveSeason().getId().equals(season.getId()) ||
                !validateCreateDto(matchCreateDto)) {
            return null;
        }

        var match = new Match();

        match.setDate(ZonedDateTime.now());
        match.setSeason(season);

        match = matchRepository.save(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        var dto = matchMapper.matchToMatchDto(match);

        if (dto.getSeason().getGroupId().equals(group.getId())) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, group.getId(), dto));
        }

        return dto;
    }

    public MatchDto updateMatch(String groupId, String matchId, MatchCreateDto matchCreateDto) {
        Optional<Match> matchOptional = matchRepository.findById(matchId);

        if (matchOptional.isEmpty()) {
            return null;
        }

        Match match = matchOptional.get();

        var groupOptional = groupRepository.findById(groupId);
        if (groupOptional.isEmpty() || !match.getSeason().equals(groupOptional.get().getActiveSeason())) {
            return null;
        }

        // Step 1: Find all teams associated with the match
        List<Team> teams = teamRepository.findAllByMatchId(matchId);

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

        if (updatedDto.getSeason().getGroupId().equals(groupId)) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, groupId, updatedDto));
        }

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
}