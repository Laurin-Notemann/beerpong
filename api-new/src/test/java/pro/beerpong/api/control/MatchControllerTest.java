package pro.beerpong.api.control;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import pro.beerpong.api.RequestUtils;
import pro.beerpong.api.TestUtils;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dto.matches.MatchCreateDto;
import pro.beerpong.api.model.dto.matches.MatchDto;
import pro.beerpong.api.model.dto.matches.MatchDtoExtended;
import pro.beerpong.api.model.dto.matches.MatchOverviewDto;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDto;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.model.dto.rulemoves.RuleMoveDto;
import pro.beerpong.api.model.dto.seasons.SeasonCreateDto;
import pro.beerpong.api.model.dto.seasons.SeasonDto;
import pro.beerpong.api.model.dto.teammembers.TeamMemberCreateDto;
import pro.beerpong.api.model.dto.teams.TeamCreateDto;

import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class MatchControllerTest {
    @LocalServerPort
    private int port;

    @Autowired
    private RequestUtils requestUtils;
    @Autowired
    private TestUtils testUtils;

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_basic() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), match.getSeasonId());
        assertEquals(prerequisiteGroup.getCreatedById(), match.getCreatedById());
        assertNotNull(match.getDate());

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        assertEquals(2, extMatch.getTeams().size());

        var team1 = extMatch.getTeams().getFirst();
        var team2 = extMatch.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(1, teamMembers1.size());
        assertEquals(1, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers2.getFirst();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());
        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team2.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        var matchMoves1 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();

        assertEquals(2, matchMoves1.size());
        assertEquals(1, matchMoves2.size());

        var normalMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove2 = matchMoves2.getFirst();

        assertNotNull(normalMove1);
        assertNotNull(normalMove1.getId());
        assertEquals(teamMember1.getId(), normalMove1.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove1.getMoveId());
        assertEquals(5, normalMove1.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove2);
        assertNotNull(normalMove2.getId());
        assertEquals(teamMember2.getId(), normalMove2.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove2.getMoveId());
        assertEquals(3, normalMove2.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_morePlayers() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 4)
                        ),
                        buildMember(
                                player4.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), match.getSeasonId());
        assertEquals(prerequisiteGroup.getCreatedById(), match.getCreatedById());
        assertNotNull(match.getDate());

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        assertEquals(2, extMatch.getTeams().size());

        var team1 = extMatch.getTeams().getFirst();
        var team2 = extMatch.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());
        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());
        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());
        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();
        var matchMoves3 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember3.getId()))
                .toList();
        var matchMoves4 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember4.getId()))
                .toList();

        assertEquals(2, matchMoves1.size());
        assertEquals(1, matchMoves2.size());
        assertEquals(1, matchMoves3.size());
        assertEquals(1, matchMoves4.size());

        var normalMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove2 = matchMoves2.getFirst();
        var normalMove3 = matchMoves3.getFirst();
        var normalMove4 = matchMoves4.getFirst();

        assertNotNull(normalMove1);
        assertNotNull(normalMove1.getId());
        assertEquals(teamMember1.getId(), normalMove1.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove1.getMoveId());
        assertEquals(5, normalMove1.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove2);
        assertNotNull(normalMove2.getId());
        assertEquals(teamMember2.getId(), normalMove2.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove2.getMoveId());
        assertEquals(2, normalMove2.getValue());

        assertNotNull(normalMove3);
        assertNotNull(normalMove3.getId());
        assertEquals(teamMember3.getId(), normalMove3.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove3.getMoveId());
        assertEquals(4, normalMove3.getValue());

        assertNotNull(normalMove4);
        assertNotNull(normalMove4.getId());
        assertEquals(teamMember4.getId(), normalMove4.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove4.getMoveId());
        assertEquals(2, normalMove4.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_moreMoves() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMoves = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).toList();

        assertTrue(normalMoves.size() >= 2);

        var frstNormalMove = normalMoves.getFirst();
        var scndNormalMove = normalMoves.get(1);
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(frstNormalMove);
        assertFalse(frstNormalMove.isFinishingMove());
        assertNotNull(scndNormalMove);
        assertFalse(scndNormalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(frstNormalMove.getId(), 5),
                                buildMove(scndNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(frstNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(frstNormalMove.getId(), 4),
                                buildMove(scndNormalMove.getId(), 6),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player4.getId(),
                                buildMove(scndNormalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), match.getSeasonId());
        assertEquals(prerequisiteGroup.getCreatedById(), match.getCreatedById());
        assertNotNull(match.getDate());

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        assertEquals(2, extMatch.getTeams().size());

        var team1 = extMatch.getTeams().getFirst();
        var team2 = extMatch.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(match.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(match.getId(), team2.getMatchId());

        var teamMembers1 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());

        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());

        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();
        var matchMoves3 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember3.getId()))
                .toList();
        var matchMoves4 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember4.getId()))
                .toList();

        assertEquals(3, matchMoves1.size());
        assertEquals(1, matchMoves2.size());
        assertEquals(2, matchMoves3.size());
        assertEquals(1, matchMoves4.size());

        var normalMove11 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(frstNormalMove.getId())).findFirst().orElseThrow();
        var normalMove12 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(scndNormalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove21 = matchMoves2.getFirst();
        var normalMove31 = matchMoves3.stream().filter(dto -> dto.getMoveId().equals(frstNormalMove.getId())).findFirst().orElseThrow();
        var normalMove32 = matchMoves3.stream().filter(dto -> dto.getMoveId().equals(scndNormalMove.getId())).findFirst().orElseThrow();
        var normalMove42 = matchMoves4.getFirst();

        assertNotNull(normalMove11);
        assertNotNull(normalMove11.getId());
        assertEquals(teamMember1.getId(), normalMove11.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove11.getMoveId());
        assertEquals(5, normalMove11.getValue());

        assertNotNull(normalMove12);
        assertNotNull(normalMove12.getId());
        assertEquals(teamMember1.getId(), normalMove12.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove12.getMoveId());
        assertEquals(2, normalMove12.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove21);
        assertNotNull(normalMove21.getId());
        assertEquals(teamMember2.getId(), normalMove21.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove21.getMoveId());
        assertEquals(2, normalMove21.getValue());

        assertNotNull(normalMove31);
        assertNotNull(normalMove31.getId());
        assertEquals(teamMember3.getId(), normalMove31.getTeamMemberId());
        assertEquals(frstNormalMove.getId(), normalMove31.getMoveId());
        assertEquals(4, normalMove31.getValue());

        assertNotNull(normalMove32);
        assertNotNull(normalMove32.getId());
        assertEquals(teamMember3.getId(), normalMove32.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove32.getMoveId());
        assertEquals(6, normalMove32.getValue());

        assertNotNull(normalMove42);
        assertNotNull(normalMove42.getId());
        assertEquals(teamMember4.getId(), normalMove42.getTeamMemberId());
        assertEquals(scndNormalMove.getId(), normalMove42.getMoveId());
        assertEquals(2, normalMove42.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_success_onlyFinish() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player2.getId()
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId()
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match.getId());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), match.getSeasonId());
        assertEquals(prerequisiteGroup.getCreatedById(), match.getCreatedById());
        assertNotNull(match.getDate());

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        assertEquals(2, extMatch.getTeams().size());

        var team1 = extMatch.getTeams().getFirst();
        var team2 = extMatch.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(extMatch.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(extMatch.getId(), team2.getMatchId());

        var teamMembers1 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = extMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(2, teamMembers1.size());
        assertEquals(2, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers1.getLast();
        var teamMember3 = teamMembers2.getFirst();
        var teamMember4 = teamMembers2.getLast();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());

        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team1.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        assertNotNull(teamMember3);
        assertNotNull(teamMember3.getId());
        assertEquals(team2.getId(), teamMember3.getTeamId());
        assertEquals(player3.getId(), teamMember3.getPlayerId());

        assertNotNull(teamMember4);
        assertNotNull(teamMember4.getId());
        assertEquals(team2.getId(), teamMember4.getTeamId());
        assertEquals(player4.getId(), teamMember4.getPlayerId());

        var matchMoves1 = extMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();

        assertEquals(1, matchMoves1.size());

        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());
    }

    @Test
    @Transactional
    public void matches_create_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var matchDto = buildDto();

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_create_invalidTeams() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(2, players.size());

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam()
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto();

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_nonUniquePlayers() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        // test non unique players in same team
        var matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player3.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test non unique players in different teams
        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player3.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player4.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidFinishMove() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        // test too many finish moves in different teams
        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test too many finish moves in same team
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test no finish move
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move amount!=1
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move amount!=1
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidPlayers() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var oldPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var oldPlayers = (List<PlayerDto>) requestUtils.assertSuccess(oldPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), oldPlayers.size());

        var oldPlayer1 = oldPlayers.getFirst();
        var oldPlayer2 = oldPlayers.get(1);
        var oldPlayer3 = oldPlayers.get(2);

        assertNotNull(oldPlayer1);
        assertNotNull(oldPlayer2);
        assertNotNull(oldPlayer3);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var otherPlayers = (List<PlayerDto>) requestUtils.assertSuccess(otherPlayerResponse, ArrayList.class);

        assertEquals(2, otherPlayers.size());

        var otherPlayer1 = otherPlayers.getFirst();
        var otherPlayer2 = otherPlayers.getLast();

        assertNotNull(otherPlayer1);
        assertNotNull(otherPlayer2);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var newPlayers = (List<PlayerDto>) requestUtils.assertSuccess(newPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), newPlayers.size());

        var newPlayer1 = newPlayers.getFirst();
        var newPlayer2 = newPlayers.get(1);
        var newPlayer3 = newPlayers.get(2);

        assertNotNull(newPlayer1);
        assertNotNull(newPlayer2);
        assertNotNull(newPlayer3);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        // test invalid player id
        var matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test invalid player id
        matchDto = buildDto(
                buildTeam(
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId()),
                        buildMember(newPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(oldPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(oldPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(otherPlayer1.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test player from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(otherPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer2.getId())
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_create_invalidMoves() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var oldMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(oldMovesResponse, ArrayList.class);

        assertTrue(oldMoves.size() >= 2);

        var oldNormalMove = oldMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var oldFinishMove = oldMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(oldNormalMove);
        assertFalse(oldNormalMove.isFinishingMove());
        assertNotNull(oldFinishMove);
        assertTrue(oldFinishMove.isFinishingMove());

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var otherMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(otherMovesResponse, ArrayList.class);

        assertTrue(otherMoves.size() >= 2);

        var otherNormalMove = otherMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var otherFinishMove = otherMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(otherNormalMove);
        assertFalse(otherNormalMove.isFinishingMove());
        assertNotNull(otherFinishMove);
        assertTrue(otherFinishMove.isFinishingMove());

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);

        var newMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var newMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(newMovesResponse, ArrayList.class);

        assertTrue(newMoves.size() >= 2);

        var newNormalMove = newMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var newFinishMove = newMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(newNormalMove);
        assertFalse(newNormalMove.isFinishingMove());
        assertNotNull(newFinishMove);
        assertTrue(newFinishMove.isFinishingMove());

        // test invalid move id
        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove("someIdThatNotExists", 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test invalid move id
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove("someIdThatNotExists", 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(oldNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(oldFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other season
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(otherNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test finish move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(otherFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        // test move from other group
        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_findAll_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", List.class, MatchDto.class);
        var matches = (List<MatchDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotNull(matches);
        assertTrue(matches.isEmpty());

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match1 = requestUtils.assertSuccess(response, MatchDto.class);

        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 9),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match2 = requestUtils.assertSuccess(response, MatchDto.class);

        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 1),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match3 = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match1);
        assertNotNull(match2);
        assertNotNull(match3);
        assertNotEquals(match1.getId(), match2.getId());
        assertNotEquals(match2.getId(), match3.getId());
        assertNotEquals(match1.getId(), match3.getId());

        match2.setDate(match1.getDate());
        match3.setDate(match1.getDate());

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", List.class, MatchDto.class);
        matches = (List<MatchDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotNull(matches);
        assertFalse(matches.isEmpty());
        assertEquals(3, matches.size());

        for (MatchDto match : matches) {
            match.setDate(match1.getDate());
            assertTrue(List.of(match1, match2, match3).contains(match));
        }
    }

    @Test
    public void matches_findAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches", List.class, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches", List.class, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_findById_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), MatchDto.class);
        var fetched = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(fetched);

        match.setDate(fetched.getDate());
        assertEquals(match, fetched);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_findById_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", List.class, MatchDto.class);
        var matches = (List<MatchDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotNull(matches);
        assertTrue(matches.isEmpty());

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/someIdThatNotExists", MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_NOT_FOUND);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_overviewAll_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/overview", List.class, MatchOverviewDto.class);
        var matches = (List<MatchOverviewDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotNull(matches);
        assertTrue(matches.isEmpty());

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var rawMatch1 = requestUtils.assertSuccess(response, MatchDto.class);
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + rawMatch1.getId() + "/overview", MatchOverviewDto.class);
        var match1 = requestUtils.assertSuccess(response, MatchOverviewDto.class);

        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 9),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var rawMatch2 = requestUtils.assertSuccess(response, MatchDto.class);
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + rawMatch2.getId() + "/overview", MatchOverviewDto.class);
        var match2 = requestUtils.assertSuccess(response, MatchOverviewDto.class);

        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 1),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId()
                        )
                )
        );

        response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var rawMatch3 = requestUtils.assertSuccess(response, MatchDto.class);
        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + rawMatch3.getId() + "/overview", MatchOverviewDto.class);
        var match3 = requestUtils.assertSuccess(response, MatchOverviewDto.class);

        assertNotNull(match1);
        assertNotNull(match2);
        assertNotNull(match3);
        assertNotEquals(match1.getId(), match2.getId());
        assertNotEquals(match2.getId(), match3.getId());
        assertNotEquals(match1.getId(), match3.getId());

        match2.setDate(match1.getDate());
        match3.setDate(match1.getDate());

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/overview", List.class, MatchOverviewDto.class);
        matches = (List<MatchOverviewDto>) requestUtils.assertSuccess(response, ArrayList.class);

        assertNotNull(matches);
        assertFalse(matches.isEmpty());
        assertEquals(3, matches.size());

        for (MatchOverviewDto match : matches) {
            match.setDate(match1.getDate());
            assertTrue(List.of(match1, match2, match3).contains(match));
        }
    }

    @Test
    public void matches_overviewAll_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches/overview", List.class, MatchOverviewDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches/overview", List.class, MatchOverviewDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_overviewById_success() {
        var profileNames = List.of("profile1", "profile2", "profile3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 3);

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotEquals(player1, player2);
        assertNotEquals(player2, player3);
        assertNotEquals(player1, player3);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/overview", MatchOverviewDto.class);
        var fetched = requestUtils.assertSuccess(response, MatchOverviewDto.class);

        assertNotNull(fetched);

        assertNotNull(fetched.getDate());
        assertNotNull(fetched.getBlueTeam());
        assertNotNull(fetched.getRedTeam());
        assertEquals(match.getId(), fetched.getId());
        assertEquals(match.getSeasonId(), fetched.getSeasonId());

        assertEquals((normalMove.getPointsForScorer() + normalMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) * 5 +
                (finishMove.getPointsForScorer() + finishMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) /* *1 */, fetched.getBlueTeam().getPoints());
        assertEquals((normalMove.getPointsForScorer() + normalMove.getPointsForTeam() * fetched.getRedTeam().getMembers().size()) * 5, fetched.getRedTeam().getPoints());

        var blueMembers = fetched.getBlueTeam().getMembers();
        var redMembers = fetched.getRedTeam().getMembers();

        assertEquals(1, blueMembers.size());
        assertEquals(2, redMembers.size());

        var member1 = blueMembers.getFirst();
        var member2 = redMembers.getFirst();
        var member3 = redMembers.getLast();

        assertNotNull(member1);
        assertNotNull(member2);
        assertNotNull(member3);

        assertEquals(player1.getId(), member1.getPlayerId());
        assertEquals((normalMove.getPointsForScorer() + normalMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) * 5 +
                (finishMove.getPointsForScorer() + finishMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) /* *1 */, member1.getPoints());
        assertEquals(2, member1.getMoves().size());
        assertEquals(5, member1.getMoves().stream().filter(matchMoveDto -> matchMoveDto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow().getCount());
        assertEquals(1, member1.getMoves().stream().filter(matchMoveDto -> matchMoveDto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow().getCount());

        assertEquals(player2.getId(), member2.getPlayerId());
        assertEquals((normalMove.getPointsForScorer() + normalMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) * 3, member2.getPoints());
        assertEquals(1, member2.getMoves().size());
        assertEquals(3, member2.getMoves().stream().filter(matchMoveDto -> matchMoveDto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow().getCount());

        assertEquals(player3.getId(), member3.getPlayerId());
        assertEquals((normalMove.getPointsForScorer() + normalMove.getPointsForTeam() * fetched.getBlueTeam().getMembers().size()) * 2, member3.getPoints());
        assertEquals(1, member3.getMoves().size());
        assertEquals(2, member3.getMoves().stream().filter(matchMoveDto -> matchMoveDto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow().getCount());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_overviewById_invalidArgs() {
        var prerequisiteGroup = testUtils.createTestGroup(port);
        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        assertNotNull(match);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/someIdThatNotExists/overview", MatchOverviewDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_NOT_FOUND);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/overview", MatchOverviewDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonDto = new SeasonCreateDto();
        seasonDto.setOldSeasonName("testing");
        seasonDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/overview", MatchOverviewDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_update_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotEquals(player1, player2);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(buildMember(player2.getId()))
        );

        var ogResponse = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var ogMatch = requestUtils.assertSuccess(ogResponse, MatchDto.class);

        var ogExtResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + ogMatch.getId() + "/extended", MatchDtoExtended.class);
        var ogExtMatch = requestUtils.assertSuccess(ogExtResponse, MatchDtoExtended.class);

        matchDto = buildDto(
                ogExtMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var newResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + ogMatch.getId(), matchDto, MatchDto.class);
        var newMatch = requestUtils.assertSuccess(newResponse, MatchDto.class);

        var newExtResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + ogMatch.getId() + "/extended", MatchDtoExtended.class);
        var newExtMatch = requestUtils.assertSuccess(newExtResponse, MatchDtoExtended.class);

        assertEquals(ogMatch.getId(), newMatch.getId());
        assertEquals(ogMatch.getDate(), newMatch.getDate());
        assertEquals(ogMatch.getSeasonId(), newMatch.getSeasonId());
        assertEquals(ogMatch.getCreatedById(), newMatch.getCreatedById());

        assertNotNull(newExtMatch.getId());
        assertEquals(prerequisiteGroup.getActiveSeasonId(), newExtMatch.getSeasonId());
        assertEquals(prerequisiteGroup.getCreatedById(), newExtMatch.getCreatedById());
        assertNotNull(newExtMatch.getDate());

        assertEquals(2, newExtMatch.getTeams().size());

        var team1 = newExtMatch.getTeams().getFirst();
        var team2 = newExtMatch.getTeams().getLast();

        assertNotNull(team1);
        assertNotNull(team1.getId());
        assertEquals(newExtMatch.getId(), team1.getMatchId());
        assertNotNull(team2);
        assertNotNull(team2.getId());
        assertEquals(newExtMatch.getId(), team2.getMatchId());

        var teamMembers1 = newExtMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team1.getId()))
                .toList();
        var teamMembers2 = newExtMatch.getTeamMembers().stream()
                .filter(teamMemberDto -> teamMemberDto.getTeamId().equals(team2.getId()))
                .toList();

        assertEquals(1, teamMembers1.size());
        assertEquals(1, teamMembers2.size());

        var teamMember1 = teamMembers1.getFirst();
        var teamMember2 = teamMembers2.getFirst();

        assertNotNull(teamMember1);
        assertNotNull(teamMember1.getId());
        assertEquals(team1.getId(), teamMember1.getTeamId());
        assertEquals(player1.getId(), teamMember1.getPlayerId());
        assertNotNull(teamMember2);
        assertNotNull(teamMember2.getId());
        assertEquals(team2.getId(), teamMember2.getTeamId());
        assertEquals(player2.getId(), teamMember2.getPlayerId());

        var matchMoves1 = newExtMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember1.getId()))
                .toList();
        var matchMoves2 = newExtMatch.getMatchMoves().stream()
                .filter(matchMove -> matchMove.getTeamMemberId().equals(teamMember2.getId()))
                .toList();

        assertEquals(2, matchMoves1.size());
        assertEquals(1, matchMoves2.size());

        var normalMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(normalMove.getId())).findFirst().orElseThrow();
        var finishMove1 = matchMoves1.stream().filter(dto -> dto.getMoveId().equals(finishMove.getId())).findFirst().orElseThrow();
        var normalMove2 = matchMoves2.getFirst();

        assertNotNull(normalMove1);
        assertNotNull(normalMove1.getId());
        assertEquals(teamMember1.getId(), normalMove1.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove1.getMoveId());
        assertEquals(5, normalMove1.getValue());

        assertNotNull(finishMove1);
        assertNotNull(finishMove1.getId());
        assertEquals(teamMember1.getId(), finishMove1.getTeamMemberId());
        assertEquals(finishMove.getId(), finishMove1.getMoveId());
        assertEquals(1, finishMove1.getValue());

        assertNotNull(normalMove2);
        assertNotNull(normalMove2.getId());
        assertEquals(teamMember2.getId(), normalMove2.getTeamMemberId());
        assertEquals(normalMove.getId(), normalMove2.getMoveId());
        assertEquals(3, normalMove2.getValue());
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_update_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_update_invalidTeams() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId()),
                        buildMember(player2.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam()
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player2.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto(
                buildTeam(
                        buildMember(player1.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);

        matchDto = buildDto();

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_WRONG_AMOUNT_OF_TEAMS);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_update_nonUniquePlayers() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test non unique players in same team
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player2.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player3.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test non unique players in different teams
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(player1.getId()),
                        buildMember(player3.getId())
                ),
                buildTeam(
                        buildMember(player3.getId()),
                        buildMember(player4.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_update_invalidFinishMove() {
        var profileNames = List.of("player1", "player2", "player3", "player4");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);
        var player4 = players.get(3);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);
        assertNotNull(player4);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test too many finish moves in different teams
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test too many finish moves in same team
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 1)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test no finish move
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 0)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test finish move amount!=1
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test finish move amount!=1
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2),
                                buildMove(finishMove.getId(), 2)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(normalMove.getId(), 2)
                        ),
                        buildMember(
                                player4.getId()
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_update_invalidPlayers() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var oldPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var oldPlayers = (List<PlayerDto>) requestUtils.assertSuccess(oldPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), oldPlayers.size());

        var oldPlayer1 = oldPlayers.getFirst();
        var oldPlayer2 = oldPlayers.get(1);
        var oldPlayer3 = oldPlayers.get(2);

        assertNotNull(oldPlayer1);
        assertNotNull(oldPlayer2);
        assertNotNull(oldPlayer3);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var otherPlayers = (List<PlayerDto>) requestUtils.assertSuccess(otherPlayerResponse, ArrayList.class);

        assertEquals(2, otherPlayers.size());

        var otherPlayer1 = otherPlayers.getFirst();
        var otherPlayer2 = otherPlayers.getLast();

        assertNotNull(otherPlayer1);
        assertNotNull(otherPlayer2);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var newPlayerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var newPlayers = (List<PlayerDto>) requestUtils.assertSuccess(newPlayerResponse, ArrayList.class);

        assertEquals(profileNames.size(), newPlayers.size());

        var newPlayer1 = newPlayers.getFirst();
        var newPlayer2 = newPlayers.get(1);
        var newPlayer3 = newPlayers.get(2);

        assertNotNull(newPlayer1);
        assertNotNull(newPlayer2);
        assertNotNull(newPlayer3);

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(normalMove);
        assertFalse(normalMove.isFinishingMove());
        assertNotNull(finishMove);
        assertTrue(finishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                newPlayer1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                newPlayer2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test invalid player id
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test invalid player id
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember("someIdThatNotExists")
                ),
                buildTeam(
                        buildMember(newPlayer3.getId()),
                        buildMember(newPlayer1.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test player from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(oldPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer3.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test player from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(oldPlayer1.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test player from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(newPlayer2.getId())
                ),
                buildTeam(
                        buildMember(otherPlayer1.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test player from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(newPlayer1.getId()),
                        buildMember(otherPlayer1.getId())
                ),
                buildTeam(
                        buildMember(newPlayer2.getId())
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_update_invalidMoves() {
        var profileNames = List.of("player1", "player2", "player3");
        var prerequisiteGroup = testUtils.createTestGroup(port, profileNames);

        var oldMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var oldMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(oldMovesResponse, ArrayList.class);

        assertTrue(oldMoves.size() >= 2);

        var oldNormalMove = oldMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var oldFinishMove = oldMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(oldNormalMove);
        assertFalse(oldNormalMove.isFinishingMove());
        assertNotNull(oldFinishMove);
        assertTrue(oldFinishMove.isFinishingMove());

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        var otherMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var otherMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(otherMovesResponse, ArrayList.class);

        assertTrue(otherMoves.size() >= 2);

        var otherNormalMove = otherMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var otherFinishMove = otherMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(otherNormalMove);
        assertFalse(otherNormalMove.isFinishingMove());
        assertNotNull(otherFinishMove);
        assertTrue(otherFinishMove.isFinishingMove());

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertEquals(profileNames.size(), players.size());

        var player1 = players.getFirst();
        var player2 = players.get(1);
        var player3 = players.get(2);

        assertNotNull(player1);
        assertNotNull(player2);
        assertNotNull(player3);

        var newMovesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/rule-moves", List.class, RuleMoveDto.class);
        var newMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(newMovesResponse, ArrayList.class);

        assertTrue(newMoves.size() >= 2);

        var newNormalMove = newMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var newFinishMove = newMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        assertNotNull(newNormalMove);
        assertFalse(newNormalMove.isFinishingMove());
        assertNotNull(newFinishMove);
        assertTrue(newFinishMove.isFinishingMove());

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 5),
                                buildMove(newFinishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                )
        );

        var response = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(response, MatchDto.class);

        var extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        var extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test invalid move id
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove("someIdThatNotExists", 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test invalid move id
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove("someIdThatNotExists", 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(oldNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test finish move from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(oldFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other season
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(oldFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(otherNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test finish move from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(otherFinishMove.getId(), 1),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(newNormalMove.getId(), 2)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);

        extResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId() + "/extended", MatchDtoExtended.class);
        extMatch = requestUtils.assertSuccess(extResponse, MatchDtoExtended.class);

        // test move from other group
        matchDto = buildDto(
                extMatch,
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        ),
                        buildMember(
                                player2.getId(),
                                buildMove(newNormalMove.getId(), 3)
                        )
                ),
                buildTeam(
                        buildMember(
                                player3.getId(),
                                buildMove(otherFinishMove.getId(), 1)
                        )
                )
        );

        response = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + match.getId(), matchDto, MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_DTO_VALIDATION_FAILED);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_delete_success() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var normalMove = ruleMoves.stream().filter(ruleMoveDto -> !ruleMoveDto.isFinishingMove()).findFirst().orElseThrow();
        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(normalMove.getId(), 5),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(
                        buildMember(
                                player2.getId(),
                                buildMove(normalMove.getId(), 3)
                        )
                )
        );

        var matchResponse = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(matchResponse, MatchDto.class);

        var response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), null, String.class);
        var result = requestUtils.assertSuccess(response, String.class);

        assertEquals("OK", result);

        response = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), MatchDto.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_NOT_FOUND);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void matches_delete_invalidSeason() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(buildMember(player2.getId()))
        );

        var matchResponse = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var match = requestUtils.assertSuccess(matchResponse, MatchDto.class);

        var response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/someIdThatNotExists/matches/" + match.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_FOUND);

        var prerequisiteGroup1 = testUtils.createTestGroup(port, List.of("player1", "player2"));

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches/" + match.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_NOT_OF_GROUP);

        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/" + match.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.SEASON_ALREADY_ENDED);
    }

    @Test
    @Transactional
    @SuppressWarnings("unchecked")
    public void matches_delete_invalidMatch() {
        var prerequisiteGroup = testUtils.createTestGroup(port);

        var playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        var players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        var player1 = players.getFirst();
        var player2 = players.getLast();

        var movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        var ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        var finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        var matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(buildMember(player2.getId()))
        );

        var matchResponse = requestUtils.performPost(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var oldMatch = requestUtils.assertSuccess(matchResponse, MatchDto.class);

        // test invalid match id (not existing)
        var response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + prerequisiteGroup.getActiveSeasonId() + "/matches/someIdThatNotExists", null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_NOT_FOUND);

        // test invalid match id (other season than provided)
        var seasonCreateDto = new SeasonCreateDto();
        seasonCreateDto.setOldSeasonName("testing");
        seasonCreateDto.setRuleMoves(List.of(
                testUtils.buildRuleMove("Normal", false, 1, 0),
                testUtils.buildRuleMove("Finish", true, 1, 3)
        ));

        var newSeasonResponse = requestUtils.performPut(port, "/groups/" + prerequisiteGroup.getId() + "/active-season", seasonCreateDto, SeasonDto.class);
        var newSeason = requestUtils.assertSuccess(newSeasonResponse, SeasonDto.class);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + oldMatch.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);

        // test invalid match id (other group than provided)
        var prerequisiteGroup1 = testUtils.createTestGroup(port);

        playerResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/players", List.class, PlayerDto.class);
        players = (List<PlayerDto>) requestUtils.assertSuccess(playerResponse, ArrayList.class);

        assertTrue(players.size() >= 2);

        player1 = players.getFirst();
        player2 = players.getLast();

        movesResponse = requestUtils.performGet(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/rule-moves", List.class, RuleMoveDto.class);
        ruleMoves = (List<RuleMoveDto>) requestUtils.assertSuccess(movesResponse, ArrayList.class);

        assertTrue(ruleMoves.size() >= 2);

        finishMove = ruleMoves.stream().filter(RuleMoveDto::isFinishingMove).findFirst().orElseThrow();

        matchDto = buildDto(
                buildTeam(
                        buildMember(
                                player1.getId(),
                                buildMove(finishMove.getId(), 1)
                        )
                ),
                buildTeam(buildMember(player2.getId()))
        );

        matchResponse = requestUtils.performPost(port, "/groups/" + prerequisiteGroup1.getId() + "/seasons/" + prerequisiteGroup1.getActiveSeasonId() + "/matches", matchDto, MatchDto.class);
        var otherGroupMatch = requestUtils.assertSuccess(matchResponse, MatchDto.class);

        response = requestUtils.performDelete(port, "/groups/" + prerequisiteGroup.getId() + "/seasons/" + newSeason.getId() + "/matches/" + otherGroupMatch.getId(), null, String.class);
        requestUtils.assertFailure(response, ErrorCodes.MATCH_GROUP_OR_SEASON_ID_DONT_MATCH);
    }

    private MatchCreateDto buildDto(TeamCreateDto... teams) {
        return buildDto(null, teams);
    }

    private MatchCreateDto buildDto(@Nullable MatchDtoExtended existing, TeamCreateDto... teams) {
        var teamList = List.of(teams);

        if (existing != null) {
            for (int i = 0; i < teams.length; i++) {
                teamList.get(i).setExistingTeamId(existing.getTeams().get(i).getId());
            }
        }

        var dto = new MatchCreateDto();
        dto.setTeams(teamList);
        return dto;
    }

    private TeamCreateDto buildTeam(TeamMemberCreateDto... members) {
        var dto = new TeamCreateDto();
        dto.setTeamMembers(List.of(members));
        return dto;
    }

    private TeamMemberCreateDto buildMember(String playerId, MatchMoveDto... moves) {
        var dto = new TeamMemberCreateDto();
        dto.setPlayerId(playerId);
        dto.setMoves(List.of(moves));
        return dto;
    }

    private MatchMoveDto buildMove(String moveId, int amount) {
        var dto = new MatchMoveDto();
        dto.setMoveId(moveId);
        dto.setCount(amount);
        return dto;
    }
}