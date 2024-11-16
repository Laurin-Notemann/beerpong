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

    @Autowired
    public TeamMemberService(TeamMemberRepository teamMemberRepository, PlayerRepository playerRepository) {
        this.teamMemberRepository = teamMemberRepository;
        this.playerRepository = playerRepository;
    }

    public ErrorCodes createTeamMembersForTeam(Team team, List<TeamMemberCreateDto> teamMembers) {
        AtomicReference<ErrorCodes> error = new AtomicReference<>();
        teamMembers.forEach(teamMemberCreateDto ->  {
            TeamMember teamMember = new TeamMember();
            teamMember.setTeam(team);
            Player player = playerRepository.findById(teamMemberCreateDto.getPlayerId()).orElse(null);
            if (player == null) {
                error.set(ErrorCodes.PLAYER_NOT_FOUND);
            }
            else {
                teamMember.setPlayer(player);
                teamMemberRepository.save(teamMember);
            }
           });
        return error.get();
    }
}
