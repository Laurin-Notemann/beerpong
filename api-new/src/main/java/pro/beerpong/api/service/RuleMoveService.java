package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.util.Pair;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pro.beerpong.api.control.GroupPresetsController;
import pro.beerpong.api.mapping.RuleMoveMapper;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RuleMoveService {
    public static final List<DefaultRuleMove> DEFAULT_BEERPONG_MOVES = List.of(
            buildRuleMove("Normal", 1, 0, false),
            buildRuleMove("Bomb", 2, 0, false),
            buildRuleMove("Bouncer", 2, 0, false),
            buildRuleMove("Trickshot", 2, 0, false),
            buildRuleMove("Save", 2, 0, false),
            buildRuleMove("Finish - Normal", 1, 3, true),
            buildRuleMove("Finish - Ring of fire", 1, 10, true)
    );

    public static final List<DefaultRuleMove> DEFAULT_MOVES = List.of(
            buildRuleMove("Normal", 1, 0, false),
            buildRuleMove("Finish - Normal", 1, 3, true)
    );

    private final SubscriptionHandler subscriptionHandler;

    private final RuleMoveRepository moveRepository;
    private final SeasonRepository seasonRepository;

    private final RuleMoveMapper moveMapper;

    public ServiceResponse<RuleMoveDto> createRuleMove(String groupId, Season season, RuleMoveCreateDto createDto, boolean callSocket) {
        if (createDto.invalidDto()) {
            return ServiceResponse.error(ErrorCodes.INVALID_RULE_MOVE_CREATE_DTO);
        }

        var rule = moveMapper.ruleMoveCreateDtoToRuleMove(createDto);
        rule.setSeason(season);

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(rule));

        if (callSocket) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_CREATE, groupId, dto));
        }

        return ServiceResponse.ok(dto);
    }

    public ServiceResponse<RuleMoveDto> updateRuleMove(String groupId, String ruleMoveId, RuleMoveCreateDto createDto) {
        if (createDto.invalidDto()) {
            return ServiceResponse.error(ErrorCodes.INVALID_RULE_MOVE_CREATE_DTO);
        }

        var move = moveRepository.findById(ruleMoveId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        move.setName(createDto.getName());
        move.setPointsForTeam(createDto.getPointsForTeam());
        move.setPointsForScorer(createDto.getPointsForScorer());
        move.setFinishingMove(createDto.isFinishingMove());

        var dto = moveMapper.ruleMoveToRuleMoveDto(moveRepository.save(move));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.RULE_MOVE_UPDATE, groupId, dto));

        return ServiceResponse.ok(dto);
    }

    public Pair<Integer, Integer> getPointsById(String ruleMoveId) {
        return moveRepository.findById(ruleMoveId)
                .map(ruleMove -> Pair.of(ruleMove.getPointsForScorer(), ruleMove.getPointsForTeam()))
                .orElse(Pair.of(0, 0));
    }

    public boolean isFinish(String ruleMoveId) {
        return moveRepository.findById(ruleMoveId)
                .map(RuleMove::isFinishingMove)
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

    public boolean copyRuleMovesFromOldSeason(String oldSeasonId, String newSeasonId, String groupId) {
        var oldSeason = seasonRepository.findById(oldSeasonId).orElseThrow();
        var newSeason = seasonRepository.findById(newSeasonId).orElseThrow();

        if (!oldSeason.getGroup().getId().equals(groupId) ||
                !newSeason.getGroup().getId().equals(groupId)) {
            return false;
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

        return true;
    }

    public void createDefaultRuleMoves(Group group, Season season) {
        Stream<DefaultRuleMove> ruleMoves;

        if (group.getSportPreset() != null && group.getSportPreset().equals(GroupPresetsController.BEERPONG.getId())) {
            ruleMoves = DEFAULT_BEERPONG_MOVES.stream();
        } else {
            ruleMoves = DEFAULT_MOVES.stream();
        }

        ruleMoves.map(ruleMove -> {
                    var move = new RuleMove();
                    move.setName(ruleMove.name());
                    move.setFinishingMove(ruleMove.finish());
                    move.setPointsForScorer(ruleMove.pointsForScorer());
                    move.setPointsForTeam(ruleMove.pointsForTeam());
                    move.setSeason(season);
                    return move;
                })
                .forEach(moveRepository::save);
    }

    private static DefaultRuleMove buildRuleMove(String name, int pointsForScorer, int pointsForTeam, boolean finish) {
        return new DefaultRuleMove(name, pointsForScorer, pointsForTeam, finish);
    }

    public record DefaultRuleMove(String name, int pointsForScorer, int pointsForTeam, boolean finish) { }
}