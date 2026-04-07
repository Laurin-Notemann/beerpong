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
import pro.beerpong.api.model.dto.groups.GroupDto;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
import pro.beerpong.api.model.dto.seasons.SeasonSettingsDto;
import pro.beerpong.api.model.dto.seasons.SeasonUpdateDto;
import pro.beerpong.api.util.DailyLeaderboard;
import pro.beerpong.api.util.RankingAlgorithm;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

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
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), SeasonDto.class);
        var season = requestUtils.assertSuccess(response, SeasonDto.class);

        assertEquals(prerequisiteGroup.getActiveSeasonId(), season.getId());
    }

    @Test
    public void season_findById_invalidId() {
        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/someIdThatNotExists", SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup2 = testUtils.createTestGroup(port);

        // season form other group
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup2.getActiveSeasonId(), SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);
    }

    @Test
    @Transactional
    public void season_start_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var groupSeasonResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), SeasonDto.class);
        var oldSeason = requestUtils.assertSuccess(groupSeasonResponse, SeasonDto.class);

        assertEquals(prerequisiteGroup.getActiveSeasonId(), oldSeason.getId());

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(response, SeasonDto.class);

        var groupResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId(), GroupDto.class);
        var updatedGroup = requestUtils.assertSuccess(groupResponse, GroupDto.class);

        var oldSeasonResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), SeasonDto.class);
        var updatedOldSeason = requestUtils.assertSuccess(oldSeasonResponse, SeasonDto.class);

        // test active season in group
        assertEquals(updatedGroup.getActiveSeasonId(), newSeason.getId());
        assertNotEquals(prerequisiteGroup.getActiveSeasonId(), newSeason.getId());

        // test new season
        assertNull(newSeason.getName());
        assertEquals(newSeason.getGroupId(), prerequisiteGroup.getId());
        assertEquals(newSeason.getCreatedById(), oldSeason.getCreatedById());
        assertNotNull(newSeason.getStartDate());
        assertNull(newSeason.getEndDate());

        // test copying of season settings
        assertEquals(newSeason.getSeasonSettings().getMaxTeamSize(), updatedOldSeason.getSeasonSettings().getMaxTeamSize());
        assertEquals(newSeason.getSeasonSettings().getMinTeamSize(), updatedOldSeason.getSeasonSettings().getMinTeamSize());
        assertEquals(newSeason.getSeasonSettings().getMinMatchesToQualify(), updatedOldSeason.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(newSeason.getSeasonSettings().getRankingAlgorithm(), updatedOldSeason.getSeasonSettings().getRankingAlgorithm());
        assertEquals(newSeason.getSeasonSettings().getDailyLeaderboard(), updatedOldSeason.getSeasonSettings().getDailyLeaderboard());
        assertEquals(newSeason.getSeasonSettings().getWakeTime(), updatedOldSeason.getSeasonSettings().getWakeTime());

        // test changes to old season
        assertNotNull(updatedOldSeason.getName());
        assertNotNull(updatedOldSeason.getEndDate());
        assertEquals(seasonDto.getOldSeasonName(), updatedOldSeason.getName());
    }

    @Test
    public void season_start_invalidName() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName(null);
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("   ");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("a");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);

        seasonDto.setOldSeasonName("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_NAME);
    }

    @Test
    public void season_start_invalidRuleMoves() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(null);

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of());

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Finish", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove(null, true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("     ", true, 1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("test", true, -1, 0)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);

        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("test", true, 0, -1)
        ));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_RULE_MOVES);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void season_findAll() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons", List.class, SeasonDto.class);
        var seasons = (List<SeasonDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(1, seasons.size());

        var firstSeason = seasons.getFirst();

        assertEquals(firstSeason.getId(), prerequisiteGroup.getActiveSeasonId());

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var oldSeasonResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + firstSeason.getId(), SeasonDto.class);
        var updatedOldSeason = requestUtils.assertSuccess(oldSeasonResponse, SeasonDto.class);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons", List.class, SeasonDto.class);
        seasons = (List<SeasonDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(2, seasons.size());
        testUtils.assertSeasonEquals(newSeason, seasons.stream().filter(toCheck -> toCheck.getId().equals(newSeason.getId())).findFirst().orElse(null));
        testUtils.assertSeasonEquals(updatedOldSeason, seasons.stream().filter(toCheck -> toCheck.getId().equals(firstSeason.getId())).findFirst().orElse(null));
    }

    @Test
    @Transactional
    public void season_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var groupResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), SeasonDto.class);
        var oldSeason = requestUtils.assertSuccess(groupResponse, SeasonDto.class);

        assertEquals(prerequisiteGroup.getActiveSeasonId(), oldSeason.getId());

        var seasonDto = buildUpdateDto(seasonSettings -> {
            seasonSettings.setDailyLeaderboard(DailyLeaderboard.LAST_24_HOURS);
            seasonSettings.setMinTeamSize(3);
        });

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        var season = requestUtils.assertSuccess(response, SeasonDto.class);

        // test that rest of group is the same
        assertEquals(oldSeason.getCreatedById(), season.getCreatedById());
        assertEquals(oldSeason.getEndDate(), season.getEndDate());
        assertEquals(oldSeason.getName(), season.getName());
        assertEquals(oldSeason.getGroupId(), season.getGroupId());

        assertEquals(DailyLeaderboard.LAST_24_HOURS, season.getSeasonSettings().getDailyLeaderboard());
        assertEquals(oldSeason.getSeasonSettings().getRankingAlgorithm(), season.getSeasonSettings().getRankingAlgorithm());
        assertEquals(3, season.getSeasonSettings().getMinTeamSize());
        assertEquals(oldSeason.getSeasonSettings().getMaxTeamSize(), season.getSeasonSettings().getMaxTeamSize());
        assertEquals(oldSeason.getSeasonSettings().getMinMatchesToQualify(), season.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(oldSeason.getSeasonSettings().getWakeTime(), season.getSeasonSettings().getWakeTime());

        seasonDto = buildUpdateDto(seasonSettings -> {
            seasonSettings.setMaxTeamSize(5);
        });

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        season = requestUtils.assertSuccess(response, SeasonDto.class);

        assertEquals(DailyLeaderboard.LAST_24_HOURS, season.getSeasonSettings().getDailyLeaderboard());
        assertEquals(oldSeason.getSeasonSettings().getRankingAlgorithm(), season.getSeasonSettings().getRankingAlgorithm());
        assertEquals(3, season.getSeasonSettings().getMinTeamSize());
        assertEquals(5, season.getSeasonSettings().getMaxTeamSize());
        assertEquals(oldSeason.getSeasonSettings().getMinMatchesToQualify(), season.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(oldSeason.getSeasonSettings().getWakeTime(), season.getSeasonSettings().getWakeTime());

        seasonDto = buildUpdateDto(seasonSettings -> {
            seasonSettings.setMinMatchesToQualify(7);
            seasonSettings.setMaxTeamSize(5);
        });

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        season = requestUtils.assertSuccess(response, SeasonDto.class);

        assertEquals(DailyLeaderboard.LAST_24_HOURS, season.getSeasonSettings().getDailyLeaderboard());
        assertEquals(oldSeason.getSeasonSettings().getRankingAlgorithm(), season.getSeasonSettings().getRankingAlgorithm());
        assertEquals(3, season.getSeasonSettings().getMinTeamSize());
        assertEquals(5, season.getSeasonSettings().getMaxTeamSize());
        assertEquals(7, season.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(oldSeason.getSeasonSettings().getWakeTime(), season.getSeasonSettings().getWakeTime());

        seasonDto = buildUpdateDto(seasonSettings -> {
            seasonSettings.setRankingAlgorithm(RankingAlgorithm.ELO);
            seasonSettings.setWakeTime("09:33");
        });

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        season = requestUtils.assertSuccess(response, SeasonDto.class);

        assertEquals(DailyLeaderboard.LAST_24_HOURS, season.getSeasonSettings().getDailyLeaderboard());
        assertEquals(RankingAlgorithm.ELO, season.getSeasonSettings().getRankingAlgorithm());
        assertEquals(3, season.getSeasonSettings().getMinTeamSize());
        assertEquals(5, season.getSeasonSettings().getMaxTeamSize());
        assertEquals(7, season.getSeasonSettings().getMinMatchesToQualify());
        assertEquals(LocalTime.of(9, 33), LocalTime.parse(season.getSeasonSettings().getWakeTime()));
    }

    @Test
    @Transactional
    public void season_update_invalidDto() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = new SeasonUpdateDto();

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.INVALID_SEASON_DTO);
    }

    @Test
    @Transactional
    public void season_update_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = this.buildUpdateDto(seasonSettings -> {});

        // test season id that not exists
        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists", seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup2 = testUtils.createTestGroup(port);

        // test season id from other group than in path
        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup2.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        // test season id from already ended season
        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @Transactional
    public void season_update_invalidWakeTimeFormat() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime(""));

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime("-1"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime("XX:xx"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime("-02:00"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime("25:35"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setWakeTime("14:61"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TIME_FORMAT);
    }

    @Test
    @Transactional
    public void season_update_invalidTeamSizes() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var seasonDto = this.buildUpdateDto(seasonSettings -> {
            seasonSettings.setMinTeamSize(3);
            seasonSettings.setMaxTeamSize(7);
        });

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertSuccess(response, SeasonDto.class);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setMaxTeamSize(2));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TEAM_SIZES);

        seasonDto = this.buildUpdateDto(seasonSettings -> seasonSettings.setMinTeamSize(8));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TEAM_SIZES);

        seasonDto = this.buildUpdateDto(seasonSettings -> {
            seasonSettings.setMinTeamSize(8);
            seasonSettings.setMaxTeamSize(7);
        });

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId(), seasonDto, SeasonDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_WRONG_TEAM_SIZES);
    }

    private SeasonUpdateDto buildUpdateDto(Consumer<SeasonSettingsDto> consumer) {
        var seasonDto = new SeasonUpdateDto();
        var seasonSettings = new SeasonSettingsDto();

        consumer.accept(seasonSettings);
        seasonDto.setSeasonSettings(seasonSettings);

        return seasonDto;
    }
}