package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;
import pro.beerpong.api.model.dto.rules.RuleCreateDto;
import pro.beerpong.api.model.dto.rules.RuleDto;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
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

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        var rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        testUtils.assertDefaultRulesEquals(RuleService.DEFAULT_RULES, rules);

        prerequisiteGroup = testUtils.createTestGroup(port, "test", "kicker");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertTrue(rules.isEmpty());

        prerequisiteGroup = testUtils.createTestGroup(port, "test", null, "test123");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        rules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertTrue(rules.isEmpty());
    }

    @Test
    public void rules_findAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", "beerpong");

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/rules", List.class, RuleDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, "test", "beerpong");

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void rules_copy_seasonStart() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var oldResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        var oldRules = (List<RuleDto>) requestUtils.assertSuccess(oldResponse, ArrayList.class);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        var newRules = (List<RuleDto>) requestUtils.assertSuccess(newResponse, ArrayList.class);

        assertEquals(oldRules.size(), newRules.size());
        testUtils.assertRulesEquals(oldRules, newRules);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void rules_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var oldResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", List.class, RuleDto.class);
        var oldRules = (List<RuleDto>) requestUtils.assertSuccess(oldResponse, ArrayList.class);

        var createdRules = List.of(
            buildRule("rule1", "descr1"),
            buildRule("rule2", "descr2"),
            buildRule("rule3", "descr3")
        );

        assertNotEquals(oldRules.size(), createdRules.size());

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, List.class, RuleDto.class);
        var newRules = (List<RuleDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotEquals(oldRules.size(), newRules.size());
        assertEquals(createdRules.size(), newRules.size());
        testUtils.assertCreatedRulesEquals(createdRules, newRules);
    }

    @Test
    public void rules_update_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", "descr2"),
                buildRule("rule3", "descr3")
        );

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    public void rules_update_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", "descr2"),
                buildRule(null, "descr3")
        );

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);

        createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", "descr2"),
                buildRule("", "descr3")
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);

        createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", "descr2"),
                buildRule("     ", "descr3")
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);

        createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", null),
                buildRule("rul3", "descr3")
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);

        createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", ""),
                buildRule("rul3", "descr3")
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);

        createdRules = List.of(
                buildRule("rule1", "descr1"),
                buildRule("rule2", "     "),
                buildRule("rul3", "descr3")
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rules", createdRules, RuleMoveDto.class);
        requestUtils.assertFailure(response, ErrorCodes.RULE_INVALID_DTO);
    }

    private RuleCreateDto buildRule(String title, String descr) {
        var ruleCreateDto = new RuleCreateDto();
        ruleCreateDto.setTitle(title);
        ruleCreateDto.setDescription(descr);
        return ruleCreateDto;
    }
}