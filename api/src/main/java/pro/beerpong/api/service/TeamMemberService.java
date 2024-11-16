package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.TeamMemberRepository;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final PlayerRepository playerRepository;
    private final MatchMoveService matchMoveService;

    @Autowired
    public TeamMemberService(TeamMemberRepository teamMemberRepository, PlayerRepository playerRepository, MatchMoveService matchMoveService) {
        this.teamMemberRepository = teamMemberRepository;
        this.playerRepository = playerRepository;
        this.matchMoveService = matchMoveService;
    }

    public ErrorCodes createTeamMembersForTeam(Team team, List<TeamMemberCreateDto> teamMembers) {
        AtomicReference<ErrorCodes> error = new AtomicReference<>();
        teamMembers.forEach(teamMemberCreateDto -> {
            TeamMember teamMember = new TeamMember();
            teamMember.setTeam(team);
            Player player = playerRepository.findById(teamMemberCreateDto.getPlayerId()).orElse(null);
            if (player == null) {
                error.set(ErrorCodes.PLAYER_NOT_FOUND);
            } else {
                teamMember.setPlayer(player);
                TeamMember savedTeamMember = teamMemberRepository.save(teamMember);

                // Erstelle die MatchMoves für dieses Teammitglied
                if (teamMemberCreateDto.getMoves() != null) {
                    matchMoveService.createMatchMoves(savedTeamMember, teamMemberCreateDto.getMoves());
                }
            }
        });
        return error.get();
    }
}
