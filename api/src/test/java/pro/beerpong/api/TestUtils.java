package pro.beerpong.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import pro.beerpong.api.model.dto.*;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Component
public class TestUtils {
    //TODO leaderboard, match, player, assets (needs s3 files), profile
    //TODO test realtime events

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
        actual.getActiveSeason().setStartDate(expected.getActiveSeason().getStartDate());

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
            assertEquals(expected.getSeason().getId(), actual.getSeason().getId());
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
            assertEquals(expected.getSeason().getId(), actual.getSeason().getId());
            assertEquals(expected.getCreatedBy().getUserId(), actual.getCreatedBy().getGroupId());
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
