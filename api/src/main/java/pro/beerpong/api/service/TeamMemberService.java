package pro.beerpong.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.TeamMemberCreateDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.TeamMemberRepository;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final PlayerRepository playerRepository;

    @Autowired
    public TeamMemberService(TeamMemberRepository teamMemberRepository, PlayerRepository playerRepository) {
        this.teamMemberRepository = teamMemberRepository;
        this.playerRepository = playerRepository;
    }

    public void createTeamMembersForTeam(Team team, List<TeamMemberCreateDto> teamMembers) {
        teamMembers.forEach(teamMemberCreateDto -> {
            TeamMember teamMember = new TeamMember();
            teamMember.setTeam(team);

            playerRepository.findById(teamMemberCreateDto.getPlayerId()).ifPresent(player -> {
                teamMember.setPlayer(player);
                teamMemberRepository.save(teamMember);
            });
        });
    }
}
