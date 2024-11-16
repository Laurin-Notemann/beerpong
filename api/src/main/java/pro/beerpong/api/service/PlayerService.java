package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.PlayerCreateDto;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.repository.SeasonRepository;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class PlayerService {
    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final ProfileRepository profileRepository;
    private final PlayerMapper playerMapper;

    @Autowired
    public PlayerService(PlayerRepository playerRepository, SeasonRepository seasonRepository,
                         ProfileRepository profileRepository, PlayerMapper playerMapper) {
        this.playerRepository = playerRepository;
        this.seasonRepository = seasonRepository;
        this.profileRepository = profileRepository;
        this.playerMapper = playerMapper;
    }

    public List<PlayerDto> getBySeasonId(String seasonId) {
        return playerRepository.findAllBySeasonId(seasonId)
                .stream()
                .map(playerMapper::playerToPlayerDto)
                .toList();
    }

    public PlayerDto createPlayer(String seasonId, String profileId, PlayerCreateDto dto) {
        return seasonRepository.findById(seasonId)
                .map(season -> this.createPlayer(season, profileId, dto))
                .orElse(null);
    }

    public PlayerDto createPlayer(Season season, String profileId, PlayerCreateDto dto) {
        var optional = profileRepository.findById(profileId);

        if (optional.isEmpty()) {
            return null;
        }

        var profile = optional.get();
        var player = playerMapper.playerCreateDtoToPlayer(dto);

        player.setSeason(season);
        player.setProfile(profile);

        return playerMapper.playerToPlayerDto(playerRepository.save(player));
    }

    public ErrorCodes deletePlayer(String id, String seasonId, String groupId) {
        AtomicReference<ErrorCodes> error = new AtomicReference<>();

        playerRepository.findById(id).ifPresentOrElse(player -> {
            if (player.getSeason().getEndDate() == null) {
                if (player.getSeason().getId().equals(seasonId) && player.getSeason().getGroupId().equals(groupId)) {
                    playerRepository.deleteById(id);
                } else {
                    error.set(ErrorCodes.PLAYER_VALIDATION_FAILED);
                }
            } else {
                error.set(ErrorCodes.SEASON_ALREADY_ENDED);
            }
        }, () -> error.set(ErrorCodes.PLAYER_NOT_FOUND));

        return error.get();
    }

    public List<PlayerDto> copyPlayersFromOldSeason(String oldSeasonId, String newSeasonId) {
        var oldSeason = seasonRepository.findById(oldSeasonId).orElse(null);
        var newSeason = seasonRepository.findById(newSeasonId).orElse(null);

        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return null;
        }

        var oldSeasonPlayers = getBySeasonId(oldSeasonId);

        return oldSeasonPlayers.stream()
                .map(oldPlayer -> {
                    var player = new Player();
                    player.setProfile(oldPlayer.getProfile());
                    player.setSeason(newSeason);

                    return playerMapper.playerToPlayerDto(playerRepository.save(player));
                })
                .toList();
    }

}
