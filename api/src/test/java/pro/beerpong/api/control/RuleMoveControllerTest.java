package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.*;
import pro.beerpong.api.service.RuleMoveService;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class RuleMoveControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_create_groupCreation() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertRuleMovesEquals(RuleMoveService.DEFAULT_BEERPONG_MOVES, ruleMoves);

        prerequisiteGroup = testUtils.createTestGroup(port, "test", "kicker");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertRuleMovesEquals(RuleMoveService.DEFAULT_MOVES, ruleMoves);

        prerequisiteGroup = testUtils.createTestGroup(port, "test", null, "test123");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertRuleMovesEquals(RuleMoveService.DEFAULT_MOVES, ruleMoves);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_create_seasonStart() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");

        var oldResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(oldResponse, ArrayList.class);

        var createRuleMoves = List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        );

        assertNotEquals(oldRuleMoves.size(), createRuleMoves.size());

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(createRuleMoves);

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var newRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(newResponse, ArrayList.class);

        assertNotEquals(oldRuleMoves.size(), newRuleMoves.size());
        testUtils.assertCreatedRuleMovesEquals(createRuleMoves, newRuleMoves);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_create_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var allMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(allMovesResponse, ArrayList.class);

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName("testing");
        ruleMoveDto.setFinishingMove(false);
        ruleMoveDto.setPointsForScorer(3);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        var ruleMove = requestUtils.assertSuccess(response, RuleMoveDto.class);

        allMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(allMovesResponse, ArrayList.class);

        assertEquals(oldRuleMoves.size() + 1, ruleMoves.size());
        assertTrue(ruleMoves.contains(ruleMove));
        assertFalse(oldRuleMoves.contains(ruleMove));
        testUtils.assertCreatedRuleMoveEquals(ruleMoveDto, ruleMove);
    }

    @Test
    public void ruleMoves_create_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName("testing");
        ruleMoveDto.setFinishingMove(false);
        ruleMoveDto.setPointsForScorer(3);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    public void ruleMoves_create_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName(null);

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("");

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("    ");

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("test");
        ruleMoveDto.setPointsForTeam(-1);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("test");
        ruleMoveDto.setPointsForTeam(0);
        ruleMoveDto.setPointsForScorer(-1);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var allMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(allMovesResponse, ArrayList.class);

        assertFalse(oldRuleMoves.isEmpty());

        var oldRuleMove = oldRuleMoves.getFirst();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName("testing");
        ruleMoveDto.setPointsForScorer(3);
        ruleMoveDto.setPointsForScorer(4);

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        var ruleMove = requestUtils.assertSuccess(response, RuleMoveDto.class);

        assertEquals(oldRuleMove.getId(), ruleMove.getId());
        assertNotEquals(oldRuleMove, ruleMove);
        testUtils.assertCreatedRuleMoveEquals(ruleMoveDto, ruleMove);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void ruleMoves_update_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var allMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(allMovesResponse, ArrayList.class);

        assertFalse(oldRuleMoves.isEmpty());

        var oldRuleMove = oldRuleMoves.getFirst();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName("testing");
        ruleMoveDto.setFinishingMove(false);
        ruleMoveDto.setPointsForScorer(3);

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void ruleMoves_update_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var allMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldRuleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(allMovesResponse, ArrayList.class);

        assertFalse(oldRuleMoves.isEmpty());

        var oldRuleMove = oldRuleMoves.getFirst();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName(null);

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("    ");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("test");
        ruleMoveDto.setPointsForTeam(-1);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);

        ruleMoveDto.setName("test");
        ruleMoveDto.setPointsForTeam(0);
        ruleMoveDto.setPointsForScorer(-1);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/" + oldRuleMove.getId(), ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_INVALID_DTO);
    }

    @Test
    public void ruleMoves_update_invalidRuleMove() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var ruleMoveDto = new RuleMoveCreateDto();
        ruleMoveDto.setName("test");

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/rule-moves/someIdThatNotExists", ruleMoveDto, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_MOVE_NOT_FOUND);
    }
}