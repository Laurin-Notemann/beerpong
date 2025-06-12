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

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class PlayerControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    //TODO season start: test copying of players (with statistics)

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void players_copy_seasonStart() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);
        var oldSeason = prerequisiteGroup.getActiveSeason();

        var profilesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(profilesResponse, ArrayList.class);

        var oldPlayersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/players", List.class, PlayerDto.class);
        var oldPlayers = (List<PlayerDto>) requestUtils.assertSuccess(oldPlayersResponse, ArrayList.class);

        var deleteResponse = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + oldSeason.getId() + "/players/" + oldPlayers.getFirst().getId(), null, String.class);
        var result = requestUtils.assertSuccess(deleteResponse, String.class);

        assertEquals("OK",  result);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var seasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(seasonResponse, SeasonDto.class);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), profiles.size());
        assertEquals(profiles.size(), oldPlayers.size());
        assertEquals(oldPlayers.size() - 1, players.size());
        assertTrue(oldPlayers.stream().allMatch(playerDto -> profiles.stream().anyMatch(profileDto -> profileDto.getId().equals(playerDto.getProfile().getId()))));
        assertTrue(players.stream().allMatch(playerDto -> playerDto.isActiveThisSeason() &&
                playerDto.getStatistics() != null &&
                playerDto.getSeason().getId().equals(newSeason.getId()) &&
                profiles.stream().anyMatch(profileDto -> profileDto.getId().equals(playerDto.getProfile().getId()))));
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void players_findAll_success() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);
        var season = prerequisiteGroup.getActiveSeason();

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            assertNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players?showStats=true", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            //TODO maybe check stats?
            assertNotNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players?showInactive=true", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            assertNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players?showInactive=true&showStats=true", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        for (PlayerDto playerDto : players) {
            assertTrue(profileNames.stream().anyMatch(s -> playerDto.getProfile().getName().equals(s)));
            assertTrue(playerDto.isActiveThisSeason());
            //TODO maybe check stats?
            assertNotNull(playerDto.getStatistics());
            assertEquals(season.getId(), playerDto.getSeason().getId());
        }

        var player = players.getFirst();

        var deleteResponse = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + player.getId(), null, String.class);
        var result = requestUtils.assertSuccess(deleteResponse, String.class);

        assertEquals("OK",  result);

        var allPlayersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players?showInactive=true", List.class, PlayerDto.class);
        var allPlayers = (List<PlayerDto>) requestUtils.assertSuccess(allPlayersResponse, ArrayList.class);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + season.getId() + "/players", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(players.size() + 1, allPlayers.size());
        assertTrue(allPlayers.stream().anyMatch(s -> s.getId().equals(player.getId())));
        assertFalse(players.stream().anyMatch(s -> s.getId().equals(player.getId())));
    }

    @Test
    @Transactional
    public void players_findAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/players", List.class, PlayerDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void players_delete_success() {
        var profileNames = List.of("player1", "player2");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playersResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player = players.getFirst();

        assertEquals(profileNames.getFirst(), player.getProfile().getName());

        var response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + player.getId(), null, String.class);
        var result = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK",  result);

        var newPlayersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var newPlayers = (List<PlayerDto>) requestUtils.assertSuccess(newPlayersResponse, ArrayList.class);

        assertFalse(newPlayers.isEmpty());
        assertEquals(players.size(), newPlayers.size() + 1);
        assertTrue(newPlayers.stream().noneMatch(playerDto -> playerDto.getProfile().getId().equals(player.getProfile().getId())));

        var first = newPlayers.getFirst();

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + first.getId(), null, String.class);
        result = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK",  result);

        newPlayersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        newPlayers = (List<PlayerDto>) requestUtils.assertSuccess(newPlayersResponse, ArrayList.class);

        assertTrue(newPlayers.isEmpty());
    }


    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void players_delete_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var playersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playersResponse, ArrayList.class);
        var player = players.getFirst();

        var response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/someIdThatNotExists", null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.PLAYER_NOT_FOUND);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/players/" + player.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/players/" + player.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var otherPlayersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeason().getId() + "/players", List.class, PlayerDto.class);
        var otherPlayers = (List<PlayerDto>) requestUtils.assertSuccess(otherPlayersResponse, ArrayList.class);
        var otherPlayer = otherPlayers.getFirst();

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + otherPlayer.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.PLAYER_VALIDATION_FAILED);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + player.getId(), null, String.class);
        var result = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK",  result);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeason().getId() + "/players/" + player.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.PLAYER_ALREADY_DELETED);
    }
}