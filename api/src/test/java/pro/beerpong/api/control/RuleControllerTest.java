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
import pro.beerpong.api.service.RuleService;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class RuleControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @SuppressWarnings("unchecked")
    public void rules_create_groupCreation() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rules", List.class, RuleDto.class);
        var rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertRulesEquals(RuleService.DEFAULT_RULES, rules);

        prerequisiteGroup = testUtils.createTestGroup(port, "test", "kicker");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rules", List.class, RuleDto.class);
        rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertTrue(rules.isEmpty());

        prerequisiteGroup = testUtils.createTestGroup(port, "test", null, "test123");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rules", List.class, RuleDto.class);
        rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertTrue(rules.isEmpty());
    }

    @Test
    public void rules_findAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");
        var season = prerequisiteGroup.getActiveSeason();

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/rules", List.class, RuleDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, "test", "beerpong");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + season.getId() + "/rules", List.class, RuleDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void ruleMoves_copy_seasonStart() {
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
}