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
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var oldResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rules", List.class, RuleDto.class);
        var oldRules = (List<RuleDto>) requestUtils.assertSuccess(oldResponse, ArrayList.class);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/rules", List.class, RuleDto.class);
        var newRules = (List<RuleDto>) requestUtils.assertSuccess(newResponse, ArrayList.class);

        assertEquals(oldRules.size(), newRules.size());
        testUtils.assertRulesEquals(oldRules, newRules);
    }
}