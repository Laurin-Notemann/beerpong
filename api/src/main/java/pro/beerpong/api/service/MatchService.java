package pro.beerpong.api.service;

import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.mapping.MatchMapper;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.*;

import java.util.Optional;

import pro.beerpong.api.sockets.EventService;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;

@Service
public class MatchService {
    private final EventService eventService;

    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final RuleMoveRepository ruleMoveService;
    private final GroupRepository groupRepository; // new field

    private final TeamService teamService;

    private final MatchMapper matchMapper;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchMoveRepository matchMoveRepository;

    @Autowired
    public MatchService(EventService eventService, MatchRepository matchRepository, RuleMoveRepository ruleMoveService, PlayerRepository playerRepository,
                        SeasonRepository seasonRepository, MatchMapper matchMapper, TeamService teamService,
                        GroupRepository groupRepository, TeamRepository teamRepository, TeamMemberRepository teamMemberRepository,
                        MatchMoveRepository matchMoveRepository) { // updated constructor
        this.eventService = eventService;
        this.matchRepository = matchRepository;
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.ruleMoveService = ruleMoveService;
        this.matchMapper = matchMapper;
        this.teamService = teamService;
        this.groupRepository = groupRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.matchMoveRepository = matchMoveRepository;
    }

    private boolean validateCreateDto(MatchCreateDto dto) {
        return dto.getTeams().stream().allMatch(teamCreateDto ->
                teamCreateDto.getTeamMembers().stream().allMatch(memberDto ->
                        playerRepository.existsById(memberDto.getPlayerId()) &&
                                memberDto.getMoves().stream().allMatch(matchMoveDto ->
                                        ruleMoveService.existsById(matchMoveDto.getMoveId()))));
    }

    public MatchDto createNewMatch(String groupId, String seasonId, MatchCreateDto matchCreateDto) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();

        if (!season.getGroupId().equals(groupId)) {
            return null;
        }

        if (!validateCreateDto(matchCreateDto)) {
            return null;
        }

        var match = new Match();

        match.setDate(ZonedDateTime.now());
        match.setSeason(season);

        match = matchRepository.save(match);

        teamService.createTeamsForMatch(match, matchCreateDto.getTeams());

        var dto = matchMapper.matchToMatchDto(match);

        if (dto.getSeason().getGroupId().equals(groupId)) {
            eventService.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, groupId, dto));
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
            eventService.callEvent(new SocketEvent<>(SocketEventData.MATCH_UPDATE, groupId, updatedDto));
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