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
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.profile.ProfileCreateDto;
import pro.beerpong.api.model.dto.profile.ProfileCreatedDto;
import pro.beerpong.api.model.dto.profile.ProfileDto;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class ProfileControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @SuppressWarnings("unchecked")
    public void profiles_create_groupCreation() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertEquals(profileNames.size(), profiles.size());
        assertTrue(profileNames.stream().allMatch(s -> profiles.stream().anyMatch(profileDto -> profileDto.getName().equals(s))));
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void profiles_create_success() {
        RequestUtils.withDebug();

        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        // test creation of profile with a non existing name
        var profileDto = new ProfileCreateDto();
        profileDto.setName("testing");

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", profileDto, ProfileCreatedDto.class);
        var result = requestUtils.assertSuccess(response, ProfileCreatedDto.class);

        assertEquals(profileDto.getName(), result.getName());
        assertEquals(prerequisiteGroup.getId(), result.getGroupId());
        assertEquals(prerequisiteGroup.getCreatedById(), result.getCreatedById());
        assertNull(result.getAssetIdAvatar());

        assertFalse(result.isReactivated());
        assertNull(result.getLastActiveSeasonId());

        // test reactivating of players when player is deleted
        var playersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playersResponse, ArrayList.class);
        var player = players.getFirst();

        var profileResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/" + player.getProfileId(), ProfileDto.class);
        var profile = requestUtils.assertSuccess(profileResponse, ProfileDto.class);

        var deleteResponse = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players/" + player.getId(), null, String.class);
        var deleteResult = requestUtils.assertSuccess(deleteResponse, String.class);

        assertEquals("OK",  deleteResult);

        profileDto.setName(profile.getName());

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", profileDto, ProfileCreatedDto.class);
        result = requestUtils.assertSuccess(response, ProfileCreatedDto.class);

        assertEquals(profileDto.getName(), result.getName());
        assertEquals(prerequisiteGroup.getId(), result.getGroupId());

        assertTrue(result.isReactivated());
        assertEquals(result.getLastActiveSeasonId(), prerequisiteGroup.getActiveSeasonId());

        // test linking to old profile if no player exists in the current season
        playersResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(playersResponse, ArrayList.class);
        player = players.getFirst();

        profileResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/" + player.getProfileId(), ProfileDto.class);
        profile = requestUtils.assertSuccess(profileResponse, ProfileDto.class);

        deleteResponse = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players/" + player.getId(), null, String.class);
        deleteResult = requestUtils.assertSuccess(deleteResponse, String.class);

        assertEquals("OK",  deleteResult);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var seasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        requestUtils.assertSuccess(seasonResponse, SeasonDto.class);

        profileDto.setName(profile.getName());

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", profileDto, ProfileCreatedDto.class);
        result = requestUtils.assertSuccess(response, ProfileCreatedDto.class);

        assertEquals(profileDto.getName(), result.getName());
        assertEquals(prerequisiteGroup.getId(), result.getGroupId());

        assertFalse(result.isReactivated());
        assertEquals(result.getLastActiveSeasonId(), prerequisiteGroup.getActiveSeasonId());
    }

    @Test
    @Transactional
    public void profiles_create_alreadyExists() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var profileDto = new ProfileCreateDto();
        profileDto.setName("player1");

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", profileDto, ProfileCreatedDto.class);
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_ALREADY_EXISTS);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void profiles_findById_success() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(response, ArrayList.class);

        for (ProfileDto profile : profiles) {
            var prfleResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/" + profile.getId(), ProfileDto.class);
            var fetched = requestUtils.assertSuccess(prfleResponse, ProfileDto.class);

            assertEquals(profile, fetched);
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    public void profiles_findById_invalidProfile() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/someIdThatNotExists", ProfileDto.class);
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_FOUND);

        var prflResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(prflResponse, ArrayList.class);

        assertFalse(profiles.isEmpty());

        var prerequisiteGroup1 = testUtils.createTestGroup(port, "test", profileNames);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/profiles/" + profiles.getFirst().getId(), ProfileDto.class);
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_FOUND);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void profiles_update_success() {
        var profileNames = List.of("player1", "player2");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var prflResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(prflResponse, ArrayList.class);

        assertFalse(profiles.isEmpty());

        var oldProfile = profiles.getFirst();

        var profileDto = new ProfileCreateDto();
        profileDto.setName(oldProfile.getName() + "test");

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/" + oldProfile.getId(), profileDto, ProfileDto.class);
        var newProfile = requestUtils.assertSuccess(response, ProfileDto.class);

        assertEquals(profileDto.getName(), newProfile.getName());
        assertEquals(oldProfile.getId(), newProfile.getId());
        assertEquals(oldProfile.getCreatedById(), newProfile.getCreatedById());
        assertEquals(oldProfile.getGroupId(), newProfile.getGroupId());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void profiles_update_invalidProfile() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, "test", profileNames);

        var profileDto = new ProfileCreateDto();
        profileDto.setName("testing");

        var response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/profiles/someIdThatNotExists", profileDto, ProfileDto.class);
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_FOUND);

        var prflResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/profiles", List.class, ProfileDto.class);
        var profiles = (List<ProfileDto>) requestUtils.assertSuccess(prflResponse, ArrayList.class);

        assertFalse(profiles.isEmpty());

        var prerequisiteGroup1 = testUtils.createTestGroup(port, "test", profileNames);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup1.getId() + "/profiles/" + profiles.getFirst().getId(), profileDto, ProfileDto.class);
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_OF_GROUP);
    }
}