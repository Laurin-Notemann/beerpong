package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.RuleMoveMapper;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;

@Service
public class RuleMoveService {
    private final SubscriptionHandler subscriptionHandler ;
    private final RuleMoveRepository moveRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMoveMapper moveMapper;

    @Autowired
    public RuleMoveService(SubscriptionHandler subscriptionHandler , RuleMoveRepository moveRepository, SeasonRepository seasonRepository,
                           RuleMoveMapper moveMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.moveRepository = moveRepository;
        this.seasonRepository = seasonRepository;
        this.moveMapper = moveMapper;
    }

    public RuleMoveDto createRuleMove(String groupId, String seasonId, RuleMoveCreateDto createDto) {
        var seasonOptional = seasonRepository.findById(seasonId);

        if (seasonOptional.isEmpty()) {
            return null;
        }

        var season = seasonOptional.get();

        var rule = moveMapper.ruleMoveCreateDtoToRuleMove(createDto);
        rule.setSeason(season);

        if (!rule.getSeason().getId().equals(seasonId) || !rule.getSeason().getGroupId().equals(groupId)) {
            return null;
        }

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(rule));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_CREATE, groupId, dto));

        return dto;
    }

    public RuleMoveDto updateRuleMove(String groupId, String ruleMoveId, RuleMoveCreateDto createDto) {
        var optional = moveRepository.findById(ruleMoveId);

        if (optional.isEmpty()) {
            return null;
        }

        var move = optional.get();

        move.setName(createDto.getName());
        move.setPointsForTeam(createDto.getPointsForTeam());
        move.setPointsForScorer(createDto.getPointsForScorer());
        move.setFinishingMove(createDto.isFinishingMove());

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(move));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_UPDATE, groupId, dto));

        return dto;
    }

    public boolean deleteById(String groupId, String ruleMoveId) {
        return moveRepository.findById(ruleMoveId)
                .map(ruleMove -> {
                    moveRepository.deleteById(ruleMoveId);

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_DELETE, groupId, moveMapper.ruleMoveToRuleMoveDto(ruleMove)));

                    return true;
                })
                .orElse(false);

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

    public List<RuleMoveDto> copyRuleMovesFromOldSeason(String oldSeasonId, String newSeasonId) {
        var oldSeason = seasonRepository.findById(oldSeasonId).orElse(null);
        var newSeason = seasonRepository.findById(newSeasonId).orElse(null);

        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return null;
        }

        var oldSeasonRuleMoves = moveRepository.findBySeasonId(oldSeasonId);

        return oldSeasonRuleMoves.stream()
                .map(oldRuleMove -> {
                    var ruleMove = new RuleMove();
                    ruleMove.setName(oldRuleMove.getName());
                    ruleMove.setPointsForTeam(oldRuleMove.getPointsForTeam());
                    ruleMove.setPointsForScorer(oldRuleMove.getPointsForScorer());
                    ruleMove.setFinishingMove(oldRuleMove.isFinishingMove());
                    ruleMove.setSeason(newSeason);

                    return moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(ruleMove));
                })
                .toList();
    }
}