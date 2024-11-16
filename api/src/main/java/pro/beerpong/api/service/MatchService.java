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
import pro.beerpong.api.repository.SeasonRepository;

@Service
public class MatchService {
    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;

    private final TeamService teamService;

    private final MatchMapper matchMapper;

    @Autowired
    public MatchService(MatchRepository matchRepository, SeasonRepository seasonRepository, MatchMapper matchMapper, TeamService teamService) {
        this.matchRepository = matchRepository;
        this.seasonRepository = seasonRepository;
        this.matchMapper = matchMapper;
        this.teamService = teamService;
    }

    public MatchDto createNewMatch(String seasonId, MatchCreateDto matchCreateDto) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();
        //TODO use mapper
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