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
import pro.beerpong.api.model.dto.matches.TeamPhotoDto;
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

    public void createTeamsForMatch(String matchId, List<TeamCreateDto> teams, @Nullable Map<String, Asset> teamAssets, List<TeamPhotoDto> teamPhotos) {
        var match = matchRepository.getReferenceById(matchId);

        List<Team> entities = teams.stream()
                .map(dto -> new Team(
                        null,
                        match,
                        resolveTeamPhoto(dto, teamAssets, teamPhotos)
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

    private Asset resolveTeamPhoto(TeamCreateDto dto, @Nullable Map<String, Asset> teamAssets, List<TeamPhotoDto> teamPhotos) {
        // match create: only save new photo for teams with photos
        if (dto.getExistingTeamId() == null) {
            if (dto.isSavePhoto()) {
                var asset = assetService.storeAsset(AssetType.TEAM_PHOTO);
                var teamPhoto = new TeamPhotoDto();

                teamPhoto.setTeamPhoto(assetService.uploadAsset(asset));
                teamPhotos.add(teamPhoto);

                return asset;
            } else {
                return null;
            }
        }

        // otherwise match update: delete old photo if photo is overridden or save new photo or use old photo
        if (teamAssets == null) {
            return null;
        }

        if (dto.isSavePhoto()) {
            // delete old photo if exists
            if (teamAssets.containsKey(dto.getExistingTeamId())) {
                assetService.deleteAsset(teamAssets.get(dto.getExistingTeamId()).getId());
            }

            var asset = assetService.storeAsset(AssetType.TEAM_PHOTO);
            var teamPhoto = new TeamPhotoDto();

            teamPhoto.setTeamId(dto.getExistingTeamId());
            teamPhoto.setTeamPhoto(assetService.uploadAsset(asset));

            teamPhotos.add(teamPhoto);

            return asset;
        } else if (teamAssets.containsKey(dto.getExistingTeamId())) {
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
