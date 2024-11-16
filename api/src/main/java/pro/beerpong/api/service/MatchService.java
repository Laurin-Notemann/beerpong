package pro.beerpong.api.service;

import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.mapping.MatchMapper;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dto.MatchDto;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.SeasonRepository;

@Service
public class MatchService {
    private final MatchRepository matchRepository;
    private final SeasonRepository seasonRepository;

    private final MatchMapper matchMapper;

    @Autowired
    public MatchService(MatchRepository matchRepository, SeasonRepository seasonRepository, MatchMapper matchMapper) {
        this.matchRepository = matchRepository;
        this.seasonRepository = seasonRepository;
        this.matchMapper = matchMapper;
    }

    public MatchDto createNewMatch(String seasonId) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();
        var match = new Match();

        match.setDate(ZonedDateTime.now());
        match.setSeason(season);

        return matchMapper.matchToMatchDto(matchRepository.save(match));
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