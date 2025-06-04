package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.TeamMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.AssetCropDto;
import pro.beerpong.api.model.dto.TeamCreateDto;
import pro.beerpong.api.model.dto.TeamDto;
import pro.beerpong.api.repository.TeamRepository;
import pro.beerpong.api.util.AssetType;

import java.util.List;
import java.util.Map;

@Service
public class TeamService {
    private final TeamRepository teamRepository;
    private final TeamMemberService teamMemberService;
    private final AssetService assetService;
    private final TeamMapper teamMapper;

    @Autowired
    public TeamService(TeamRepository teamRepository, TeamMemberService teamMemberService, AssetService assetService, TeamMapper teamMapper) {
        this.teamRepository = teamRepository;
        this.teamMemberService = teamMemberService;
        this.assetService = assetService;
        this.teamMapper = teamMapper;
    }

    public void createTeamsForMatch(Match match, List<TeamCreateDto> teams, @Nullable Map<String, Asset> teamAssets) {
        teams.forEach(teamCreateDto -> {
            Team team = new Team();

            team.setMatch(match);

            if (teamAssets == null && teamCreateDto.isSavePhoto()) {
                var asset = assetService.storeAsset(AssetType.TEAM_PHOTO);

                team.setPhotoAsset(assetService.map(asset));
            } else if (teamAssets != null && teamCreateDto.getExistingTeamId() != null && teamAssets.containsKey(teamCreateDto.getExistingTeamId())) {
                var asset = teamAssets.get(teamCreateDto.getExistingTeamId());

                team.setPhotoAsset(asset);
            }

            Team savedTeam = teamRepository.save(team);

            // Erstelle TeamMembers für das Team
            teamMemberService.createTeamMembersForTeam(savedTeam, teamCreateDto.getTeamMembers());
        });
    }

    public List<TeamDto> buildTeamDtos(Match match) {
        return teamRepository.findAllByMatchId(match.getId()).stream()
                .map(this.teamMapper::teamToTeamDto)
                .toList();
    }
}
