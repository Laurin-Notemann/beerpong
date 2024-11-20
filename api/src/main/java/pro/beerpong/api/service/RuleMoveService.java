package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.util.Pair;
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
    private static final List<RuleMove> DEFAULT_RULE_MOVES = List.of(
            buildRuleMove("Normal", 1, 0, false),
            buildRuleMove("Bomb", 1, 0, false),
            buildRuleMove("Bouncer", 1, 0, false),
            buildRuleMove("Trickshot", 1, 0, false),
            buildRuleMove("Save", 1, 0, false),
            buildRuleMove("Finish - Normal", 0, 3, true),
            buildRuleMove("Finish - Ring of fire", 0, 10, true)
    );

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

    public Pair<Integer, Integer> getPointsById(String ruleMoveId) {
        return moveRepository.findById(ruleMoveId)
                .map(ruleMove -> Pair.of(ruleMove.getPointsForScorer(), ruleMove.getPointsForTeam()))
                .orElse(Pair.of(0, 0));
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

        moveRepository.findBySeasonId(oldSeason.getId()).forEach(oldRuleMove -> {
            var ruleMove = new RuleMove();

            ruleMove.setName(oldRuleMove.getName());
            ruleMove.setPointsForTeam(oldRuleMove.getPointsForTeam());
            ruleMove.setPointsForScorer(oldRuleMove.getPointsForScorer());
            ruleMove.setFinishingMove(oldRuleMove.isFinishingMove());
            ruleMove.setSeason(newSeason);

            moveRepository.save(ruleMove);
        });
    }

    public void createDefaultRuleMoves(Season season) {
        DEFAULT_RULE_MOVES.stream()
                .map(ruleMove -> {
                    var move = ruleMove.clone();
                    move.setSeason(season);
                    return move;
                })
                .forEach(moveRepository::save);
    }

    private static RuleMove buildRuleMove(String name, int pointsForScorer, int pointsForTeam, boolean finish) {
        var ruleMove = new RuleMove();

        ruleMove.setName(name);
        ruleMove.setPointsForScorer(pointsForScorer);
        ruleMove.setPointsForTeam(pointsForTeam);
        ruleMove.setFinishingMove(finish);

        return ruleMove;
    }
}