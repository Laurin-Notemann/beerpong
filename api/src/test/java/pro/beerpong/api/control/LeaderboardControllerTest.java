package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dto.leaderboard.LeaderboardDto;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class LeaderboardControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    public void leaderboard_get_Alltime_empty() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/leaderboard?scope=all-time", LeaderboardDto.class);
        var leaderboard = requestUtils.assertSuccess(response, LeaderboardDto.class);

        assertEquals(0, leaderboard.getNumMatches());
        assertEquals(3, leaderboard.getNumPlayers());
        assertEquals(prerequisiteGroup.getCreatedAt().toEpochSecond(), leaderboard.getStartedAt().toEpochSecond());
    }

    @Test
    public void leaderboard_get_invalidScope() {
        var prerequisiteGroup = testUtils.createTestGroup(port, "test");

        // test invalid scope (non provided)
        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/leaderboard?scope=something", LeaderboardDto.class);
        requestUtils.assertFailure(response, ErrorCodes.LEADERBOARD_SCOPE_NOT_FOUND);

        // test invalid scope (scope=season without season id)
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/leaderboard?scope=season", LeaderboardDto.class);
        requestUtils.assertFailure(response, ErrorCodes.LEADERBOARD_SEASON_NOT_FOUND);

        // test invalid scope (invalid season id)
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/leaderboard?scope=season&seasonId=someId", LeaderboardDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, "test123");

        // test invalid scope (season id from other group)
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/leaderboard?scope=season&seasonId=" + prerequisiteGroup1.getActiveSeasonId(), LeaderboardDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }
}