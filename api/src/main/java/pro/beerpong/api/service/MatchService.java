package pro.beerpong.api.service;

import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.mapping.MatchMapper;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
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

    private final TeamService teamService;

    private final MatchMapper matchMapper;

    @Autowired
    public MatchService(EventService eventService, MatchRepository matchRepository, RuleMoveRepository ruleMoveService, PlayerRepository playerRepository,
                        SeasonRepository seasonRepository, MatchMapper matchMapper, TeamService teamService) {
        this.eventService = eventService;
        this.matchRepository = matchRepository;
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.ruleMoveService = ruleMoveService;
        this.matchMapper = matchMapper;
        this.teamService = teamService;
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