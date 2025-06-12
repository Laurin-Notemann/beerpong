package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.model.dto.*;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class SeasonControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    public void season_findById_success() {
        var prerequisteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons/" + prerequisteGroup.getActiveSeason().getId(), SeasonDto.class);
        var season = requestUtils.assertSuccess(response, SeasonDto.class);

        testUtils.assertSeasonEquals(prerequisteGroup.getActiveSeason(), season);
    }

    @Test
    public void season_findById_invalidId() {
        var prerequisteGroup1 = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisteGroup1.getId() + "/seasons/someIdThatNotExists", SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisteGroup2 = testUtils.createTestGroup(port);

        // season form other group
        response = requestUtils.performGet(port, "/groups/" + prerequisteGroup1.getId() + "/seasons/" + prerequisteGroup2.getActiveSeason().getId(), SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);
    }

    @Test
    @Transactional
    public void season_start_success() {
        var prerequisteGroup = testUtils.createTestGroup(port);
        var oldSeason = prerequisteGroup.getActiveSeason();

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(response, SeasonDto.class);

        var groupResponse = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId(), GroupDto.class);
        var updatedGroup = requestUtils.assertSuccess(groupResponse, GroupDto.class);

        var oldSeasonResponse = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons/" + oldSeason.getId(), SeasonDto.class);
        var updatedOldSeason = requestUtils.assertSuccess(oldSeasonResponse, SeasonDto.class);

        // test active season in group
        testUtils.assertSeasonEquals(updatedGroup.getActiveSeason(), newSeason);
        assertNotEquals(oldSeason.getId(), newSeason.getId());

        // test new season
        assertNull(newSeason.getName());
        assertEquals(newSeason.getGroupId(), prerequisteGroup.getId());
        assertEquals(newSeason.getCreatedBy(), oldSeason.getCreatedBy());
        assertNotNull(newSeason.getStartDate());
        assertNull(newSeason.getEndDate());

        // test copying of season settings
        assertEquals(newSeason.getSeasonSettings().getMaxTeamSize(), updatedOldSeason.getSeasonSettings().getMaxTeamSize());
        assertEquals(newSeason.getSeasonSettings().getMinTeamSize(), updatedOldSeason.getSeasonSettings().getMinTeamSize());
        assertEquals(newSeason.getSeasonSettings().getMinMatchesToQualify(), updatedOldSeason.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(newSeason.getSeasonSettings().getRankingAlgorithm(), updatedOldSeason.getSeasonSettings().getRankingAlgorithm());
        assertEquals(newSeason.getSeasonSettings().getDailyLeaderboard(), updatedOldSeason.getSeasonSettings().getDailyLeaderboard());
        //TODO adjust for new wakeTime
        assertEquals(newSeason.getSeasonSettings().getWakeTimeHour(), updatedOldSeason.getSeasonSettings().getWakeTimeHour());

        // test changes to old season
        assertNotNull(updatedOldSeason.getName());
        assertNotNull(updatedOldSeason.getEndDate());
        assertEquals(seasonDto.getOldSeasonName(), updatedOldSeason.getName());

        //TODO test creation of players (with statistics)
        //TODO test creation of rules
        //TODO test creation of rule moves
    }

    @Test
    public void season_start_invalidName() {
        var prerequisteGroup = testUtils.createTestGroup(port);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName(null);
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("");

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("   ");

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("a");

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);
    }

    @Test
    public void season_start_invalidRuleMoves() {
        var prerequisteGroup = testUtils.createTestGroup(port);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(null);

        var response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of());

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Finish", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove(null, true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("     ", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("test", true, -1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("test", true, 0, -1)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void season_findAll() {
        var prerequisteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons", List.class, SeasonDto.class);
        var seasons = (List<SeasonDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(1, seasons.size());

        var firstSeason = seasons.getFirst();

        testUtils.assertSeasonEquals(firstSeason, prerequisteGroup.getActiveSeason());

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var oldSeasonResponse = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons/" + firstSeason.getId(), SeasonDto.class);
        var updatedOldSeason = requestUtils.assertSuccess(oldSeasonResponse, SeasonDto.class);

        response = requestUtils.performGet(port, "/groups/" + prerequisteGroup.getId() + "/seasons", List.class, SeasonDto.class);
        seasons = (List<SeasonDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(2, seasons.size());
        testUtils.assertSeasonEquals(newSeason, seasons.stream().filter(toCheck -> toCheck.getId().equals(newSeason.getId())).findFirst().orElse(null));
        testUtils.assertSeasonEquals(updatedOldSeason, seasons.stream().filter(toCheck -> toCheck.getId().equals(firstSeason.getId())).findFirst().orElse(null));
    }
}