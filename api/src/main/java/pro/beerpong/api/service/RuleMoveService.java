package pro.beerpong.api.service;

import jakarta.validation.constraints.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.RuleMoveMapper;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.RuleMoveDto;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;
import java.util.Optional;

@Service
public class RuleMoveService {
    private final SubscriptionHandler subscriptionHandler;
    private final RuleMoveRepository moveRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMoveMapper moveMapper;

    @Autowired
    public RuleMoveService(SubscriptionHandler subscriptionHandler, RuleMoveRepository moveRepository, SeasonRepository seasonRepository,
                           RuleMoveMapper moveMapper) {
        this.subscriptionHandler = subscriptionHandler;
        this.moveRepository = moveRepository;
        this.seasonRepository = seasonRepository;
        this.moveMapper = moveMapper;
    }

    public RuleMoveDto createRuleMove(Group group, Season season, RuleMoveCreateDto createDto) {
        var rule = moveMapper.ruleMoveCreateDtoToRuleMove(createDto);
        rule.setSeason(season);

        if (!rule.getSeason().getId().equals(season.getId()) || !rule.getSeason().getGroupId().equals(group.getId())) {
            return null;
        }

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(rule));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_CREATE, group.getId(), dto));

        return dto;
    }

    public boolean validateGroupAndSeason(String groupId, String seasonId, RuleMoveDto dto) {
        return dto.getSeason().getId().equals(seasonId) && dto.getSeason().getGroupId().equals(groupId);
    }

    public RuleMoveDto updateRuleMove(String groupId, RuleMoveDto move, RuleMoveCreateDto createDto) {
        move.setName(createDto.getName());
        move.setPointsForTeam(createDto.getPointsForTeam());
        move.setPointsForScorer(createDto.getPointsForScorer());
        move.setFinishingMove(createDto.isFinishingMove());

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(moveMapper.ruleMoveDtoToRuleMove(move)));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_UPDATE, groupId, dto));

        return dto;
    }

    public boolean delete(String groupId, RuleMoveDto dto) {
        return Optional.ofNullable(dto)
                .map(ruleMove -> {
                    moveRepository.deleteById(ruleMove.getId());

                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_DELETE, groupId, ruleMove));

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

    public void copyRuleMovesFromOldSeason(Season oldSeason, Season newSeason) {
        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return;
        }

        var oldSeasonRuleMoves = moveRepository.findBySeasonId(oldSeason.getId());

        oldSeasonRuleMoves.forEach(oldRuleMove -> {
            var ruleMove = new RuleMove();

            ruleMove.setName(oldRuleMove.getName());
            ruleMove.setPointsForTeam(oldRuleMove.getPointsForTeam());
            ruleMove.setPointsForScorer(oldRuleMove.getPointsForScorer());
            ruleMove.setFinishingMove(oldRuleMove.isFinishingMove());
            ruleMove.setSeason(newSeason);

            moveRepository.save(ruleMove);
        });
    }
}