package pro.beerpong.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.groups.GroupCreateDto;
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveCreateDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;
import pro.beerpong.api.model.dto.rules.RuleCreateDto;
import pro.beerpong.api.model.dto.rules.RuleDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
import pro.beerpong.api.service.RuleMoveService;
import pro.beerpong.api.service.RuleService;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@Component
public class TestUtils {
    //TODO tests for: realtime events, assets (needs s3 files), leaderboard (+stats)
    //TODO add descr to every test case

    @Autowired
    private RequestUtils requestUtils;

    /* GROUPS */
    public void assertGroupEquals(GroupDto expected, GroupDto actual) {
        if (expected == null || actual == null) {
            assertNull(expected);
            assertNull(actual);
            return;
        }

        actual.setCreatedAt(expected.getCreatedAt());

        assertEquals(expected, actual);
    }

    public GroupDto createTestGroup(int port) {
        return this.createTestGroup(port, "test");
    }

    public GroupDto createTestGroup(int port, String name) {
        return this.createTestGroup(port, name, List.of("player1", "player2"));
    }

    public GroupDto createTestGroup(int port, List<String> profileNames) {
        return this.createTestGroup(port, "test", profileNames);
    }

    public GroupDto createTestGroup(int port, String name, List<String> profileNames) {
        return this.createTestGroup(port, name, profileNames, "beerpong", null);
    }

    public GroupDto createTestGroup(int port, String name, String preset) {
        return createTestGroup(port, name, preset, null);
    }

    public GroupDto createTestGroup(int port, String name, String preset, String customSportName) {
        return createTestGroup(port, name, List.of("player1", "player2"), preset, customSportName);
    }

    public GroupDto createTestGroup(int port, String name, List<String> profileNames, String preset, String customSportName) {
        var response = postGroup(port, name, profileNames, preset, customSportName);
        return requestUtils.assertSuccess(response, GroupDto.class);
    }

    public ResponseEntity<Object> postGroup(int port, String name, List<String> profileNames, String preset) {
        return this.postGroup(port, name, profileNames, preset, null);
    }

    public ResponseEntity<Object> postGroup(int port, String name, List<String> profileNames, String preset, String customSportName) {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(profileNames);
        createDto.setName(name);
        createDto.setSportPreset(preset);
        createDto.setCustomSportName(customSportName);

        return requestUtils.performPost(port, "/groups", createDto, GroupDto.class);
    }

    /* RULE MOVES */
    public RuleMoveCreateDto buildRuleMove(String name, boolean finish, int scorerPoints, int teamPoints) {
        var ruleMove = new RuleMoveCreateDto();
        ruleMove.setName(name);
        ruleMove.setFinishingMove(finish);
        ruleMove.setPointsForScorer(scorerPoints);
        ruleMove.setPointsForTeam(teamPoints);
        return ruleMove;
    }

    public void assertDefaultRuleMovesEquals(List<RuleMoveService.DefaultRuleMove> expected, List<RuleMoveDto> actual) {
        List<RuleMoveDto> ruleMoves = expected.stream()
                .map(defaultRule -> {
                    var ruleMoveDto = new RuleMoveDto();
                    ruleMoveDto.setFinishingMove(defaultRule.finish());
                    ruleMoveDto.setPointsForScorer(defaultRule.pointsForScorer());
                    ruleMoveDto.setPointsForTeam(defaultRule.pointsForTeam());
                    ruleMoveDto.setName(defaultRule.name());
                    return ruleMoveDto;
                })
                .toList();
        assertRuleMovesEquals(ruleMoves, actual);
    }

    public void assertRuleMovesEquals(List<RuleMoveDto> expected, List<RuleMoveDto> actual) {
        assertRuleMovesEquals(expected, actual, false);
    }

    public void assertRuleMovesEquals(List<RuleMoveDto> expected, List<RuleMoveDto> actual, boolean full) {
        assertEquals(expected.size(), actual.size());

        for (int i = 0; i < expected.size(); i++) {
            assertRuleMoveEquals(expected.get(i), actual.get(i), full);
        }
    }

    public void assertRuleMoveEquals(RuleMoveDto expected, RuleMoveDto actual, boolean full) {
        if (full) {
            assertEquals(expected.getId(), actual.getId());
            assertEquals(expected.getSeasonId(), actual.getSeasonId());
        }
        assertEquals(expected.getName(), actual.getName());
        assertEquals(expected.isFinishingMove(), actual.isFinishingMove());
        assertEquals(expected.getPointsForScorer(), actual.getPointsForScorer());
        assertEquals(expected.getPointsForTeam(), actual.getPointsForTeam());
    }

    public void assertCreatedRuleMovesEquals(List<RuleMoveCreateDto> created, List<RuleMoveDto> actual) {
        assertEquals(created.size(), actual.size());

        for (int i = 0; i < created.size(); i++) {
            assertCreatedRuleMoveEquals(created.get(i), actual.get(i));
        }
    }

    public void assertCreatedRuleMoveEquals(RuleMoveCreateDto createDto, RuleMoveDto actual) {
        assertEquals(createDto.getName(), actual.getName());
        assertEquals(createDto.isFinishingMove(), actual.isFinishingMove());
        assertEquals(createDto.getPointsForScorer(), actual.getPointsForScorer());
        assertEquals(createDto.getPointsForTeam(), actual.getPointsForTeam());
    }

    /* RULES */
    public void assertDefaultRulesEquals(List<RuleService.DefaultRule> expected, List<RuleDto> actual) {
        List<RuleDto> rules = expected.stream()
                .map(defaultRule -> {
                   var ruleDto = new RuleDto();
                   ruleDto.setDescription(defaultRule.descr());
                   ruleDto.setTitle(defaultRule.title());
                   return ruleDto;
                })
                .toList();

        assertRulesEquals(rules, actual);
    }

    public void assertRulesEquals(List<RuleDto> expected, List<RuleDto> actual) {
        assertRulesEquals(expected, actual, false);
    }

    public void assertRulesEquals(List<RuleDto> expected, List<RuleDto> actual, boolean full) {
        assertEquals(expected.size(), actual.size());

        for (int i = 0; i < expected.size(); i++) {
            assertRuleEquals(expected.get(i), actual.get(i), full);
        }
    }

    public void assertRuleEquals(RuleDto expected, RuleDto actual, boolean full) {
        if (full) {
            assertEquals(expected.getId(), actual.getId());
            assertEquals(expected.getSeasonId(), actual.getSeasonId());
            assertEquals(expected.getCreatedById(), actual.getCreatedById());
        }
        assertEquals(expected.getTitle(), actual.getTitle());
        assertEquals(expected.getDescription(), actual.getDescription());
    }

    public void assertCreatedRulesEquals(List<RuleCreateDto> created, List<RuleDto> actual) {
        assertEquals(created.size(), actual.size());

        for (int i = 0; i < created.size(); i++) {
            assertCreatedRuleEquals(created.get(i), actual.get(i));
        }
    }

    public void assertCreatedRuleEquals(RuleCreateDto createDto, RuleDto actual) {
        assertEquals(createDto.getDescription(), actual.getDescription());
        assertEquals(createDto.getTitle(), actual.getTitle());
    }

    /* SEASONS */
    public void assertSeasonEquals(SeasonDto expected, SeasonDto actual) {
        if (expected == null || actual == null) {
            assertNull(expected);
            assertNull(actual);
            return;
        }

        actual.setStartDate(expected.getStartDate());

        assertEquals(expected, actual);
    }
}
