package pro.beerpong.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.mapping.RuleMoveMapper;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;

@Service
public class RuleMoveService {
    private final RuleMoveRepository moveRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMoveMapper moveMapper;

    @Autowired
    public RuleMoveService(RuleMoveRepository moveRepository, SeasonRepository seasonRepository, RuleMoveMapper moveMapper) {
        this.moveRepository = moveRepository;
        this.seasonRepository = seasonRepository;
        this.moveMapper = moveMapper;
    }

    public RuleMoveDto createRuleMove(String seasonId, RuleMoveCreateDto dto) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();

        var rule = moveMapper.ruleMoveCreateDtoToRuleMove(dto);
        rule.setSeason(season);

        return moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(rule));
    }

    public RuleMoveDto updateRuleMove(String ruleMoveId, RuleMoveCreateDto dto) {
        var optional = moveRepository.findById(ruleMoveId);

        if (optional.isEmpty()) {
            return null;
        }

        var move = optional.get();

        move.setName(dto.getName());
        move.setPointsForTeam(dto.getPointsForTeam());
        move.setPointsForScorer(dto.getPointsForScorer());
        move.setFinishingMove(dto.isFinishingMove());

        return moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(move));
    }

    public boolean deleteById(String ruleMoveId) {
        if (moveRepository.findById(ruleMoveId).isPresent()) {
            moveRepository.deleteById(ruleMoveId);
            return true;
        } else {
            return false;
        }
    }

    public RuleMoveDto getById(String ruleMoveId) {
        return moveRepository.findById(ruleMoveId)
                .map(moveMapper::ruleMoveToRuleMoveDto)
                .orElse(null);
    }

    public List<RuleMoveDto> getAllMoves(String seasonId) {
        return moveRepository.findBySeasonId(seasonId)
                .stream()
                .map(moveMapper::ruleMoveToRuleMoveDto)
                .toList();
    }
}