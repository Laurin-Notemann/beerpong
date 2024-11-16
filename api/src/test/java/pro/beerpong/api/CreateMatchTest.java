package pro.beerpong.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import jakarta.transaction.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pro.beerpong.api.model.dto.MatchCreateDto;
import pro.beerpong.api.model.dto.TeamCreateDto;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.TeamRepository;
import pro.beerpong.api.repository.TeamMemberRepository;
import pro.beerpong.api.repository.SeasonRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CreateMatchTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private SeasonRepository seasonRepository;

    private String groupId = "test-group-id";
    private String seasonId = "test-season-id";

    @BeforeEach
    void setUp() {
        // Set up initial data for Season and Group
        if (seasonRepository.findById(seasonId).isEmpty()) {
            var season = new pro.beerpong.api.model.dao.Season();
            season.setId(seasonId);
            season.setGroupId(groupId);
            seasonRepository.save(season);
        }
    }

    @Test
    void createMatch_withTeamsAndMembers_shouldCreateMatchAndTeams() throws Exception {
        // Arrange: Erstelle ein MatchCreateDto mit Teams und TeamMembers
        MatchCreateDto matchCreateDto = new MatchCreateDto();
        TeamCreateDto team1 = new TeamCreateDto();
        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
        member1.setPlayerId("player1-id");

        TeamMemberCreateDto member2 = new TeamMemberCreateDto();
        member2.setPlayerId("player2-id");

        TeamMemberCreateDto member3 = new TeamMemberCreateDto();
        member3.setPlayerId("player3-id");

        TeamMemberCreateDto member4 = new TeamMemberCreateDto();
        member4.setPlayerId("player4-id");
        team1.setTeamMembers(List.of(

                member1,
                member2
        ));

        TeamCreateDto team2 = new TeamCreateDto();
        team2.setTeamMembers(List.of(
                member3,
                member4
        ));

        matchCreateDto.setTeams(List.of(team1, team2));

        // Act: Sende eine POST-Anfrage zum Erstellen des Matches
        ResultActions resultActions = mockMvc.perform(post("/groups/{groupId}/seasons/{seasonId}/match", groupId, seasonId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(matchCreateDto)));

        // Assert: Überprüfe die Antwort und die Datenbankeinträge
        resultActions.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.data.id").exists());

        // Überprüfe, ob das Match, die Teams und die TeamMembers in der Datenbank erstellt wurden
        var matches = matchRepository.findAll();
        assertThat(matches).hasSize(1);

        var teams = teamRepository.findAll();
        assertThat(teams).hasSize(2);

        var teamMembers = teamMemberRepository.findAll();
        assertThat(teamMembers).hasSize(4);
    }

    @Test
    void getAllMatches_shouldReturnAllMatchesForSeason() throws Exception {
        // Arrange: Erstelle ein Match in der Datenbank
        MatchCreateDto matchCreateDto = new MatchCreateDto();
        TeamCreateDto team1 = new TeamCreateDto();
        TeamMemberCreateDto member1 = new TeamMemberCreateDto();
        member1.setPlayerId("player1-id");
        team1.setTeamMembers(List.of(member1));
        matchCreateDto.setTeams(List.of(team1));

        mockMvc.perform(post("/groups/{groupId}/seasons/{seasonId}/match", groupId, seasonId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(matchCreateDto)))
                .andExpect(status().isOk());

        // Act: Sende eine GET-Anfrage, um alle Matches abzurufen
        ResultActions resultActions = mockMvc.perform(get("/groups/{groupId}/seasons/{seasonId}/matches", groupId, seasonId)
                .contentType(MediaType.APPLICATION_JSON));

        // Assert: Überprüfe die Antwort
        resultActions.andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1));
    }
}
