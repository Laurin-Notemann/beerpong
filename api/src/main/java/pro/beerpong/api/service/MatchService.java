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

@Service
public class MatchService {
    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final RuleMoveRepository ruleMoveService;

    private final TeamService teamService;

    private final MatchMapper matchMapper;

    @Autowired
    public MatchService(MatchRepository matchRepository, RuleMoveRepository ruleMoveService, PlayerRepository playerRepository,
                        SeasonRepository seasonRepository, MatchMapper matchMapper, TeamService teamService) {
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

    public MatchDto createNewMatch(String seasonId, MatchCreateDto matchCreateDto) {
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

        return matchMapper.matchToMatchDto(match);
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