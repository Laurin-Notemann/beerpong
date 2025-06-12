package pro.beerpong.api.control;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;

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
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_OF_GROUP);
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
        assertEquals(oldProfile.getCreatedBy(), newProfile.getCreatedBy());
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
        requestUtils.assertFailure(response, ErrorCodes.PROFILE_NOT_FOUND);
    }
}