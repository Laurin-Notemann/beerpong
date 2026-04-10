package pro.beerpong.api.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.TeamMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.Match;
import pro.beerpong.api.model.dao.Team;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.teams.TeamCreateDto;
import pro.beerpong.api.model.dto.teams.TeamDto;
import pro.beerpong.api.repository.AssetRepository;
import pro.beerpong.api.repository.MatchRepository;
import pro.beerpong.api.repository.TeamRepository;
import pro.beerpong.api.util.AssetType;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TeamService {
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;

    private final TeamMemberService teamMemberService;
    private final AssetService assetService;

    private final TeamMapper teamMapper;
    private final AssetRepository assetRepository;

    public void createTeamsForMatch(String matchId, List<TeamCreateDto> teams, @Nullable Map<String, Asset> teamAssets) {
        var match = matchRepository.getReferenceById(matchId);

        List<Team> entities = teams.stream()
                .map(dto -> new Team(
                        null,
                        match,
                        resolveTeamPhoto(dto, teamAssets)
                ))
                .toList();

        List<Team> saved = teamRepository.saveAll(entities);

        for (int i = 0; i < saved.size(); i++) {
            var members = teams.get(i).getTeamMembers();

            if (members != null && !members.isEmpty()) {
                teamMemberService.createTeamMembersForTeam(saved.get(i).getId(), members);
            }
        }
    }

    private Asset resolveTeamPhoto(TeamCreateDto dto, @Nullable Map<String, Asset> teamAssets) {
        if (teamAssets == null && dto.isSavePhoto()) {
            var asset = assetService.storeAsset(AssetType.TEAM_PHOTO);

            //TODO somehow we have to give this to the app
            assetService.uploadAsset(asset);

            return asset;
        } else if (teamAssets != null && dto.getExistingTeamId() != null &&
                teamAssets.containsKey(dto.getExistingTeamId())) {
            return teamAssets.get(dto.getExistingTeamId());
        }

        return null;
    }

    public List<TeamDto> buildTeamDtos(Match match) {
        return teamRepository.findByMatchId(match.getId()).stream()
                .map(this.teamMapper::teamToTeamDto)
                .toList();
    }
}
