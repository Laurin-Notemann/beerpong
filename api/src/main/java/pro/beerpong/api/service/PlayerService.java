package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.PlayerCreateDto;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class PlayerService {
    private final SubscriptionHandler subscriptionHandler;
    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final ProfileRepository profileRepository;
    private final PlayerMapper playerMapper;

    public List<PlayerDto> getBySeasonId(String seasonId) {
        return playerRepository.findAllBySeasonId(seasonId)
                .stream()
                .map(this::createStatisticsEnrichedDto)
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

        var enrichedDto = createStatisticsEnrichedDto(playerRepository.save(player));

        subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PLAYER_CREATE, season.getGroupId(), enrichedDto));

        return enrichedDto;
    }

    public ErrorCodes deletePlayer(String id, String seasonId, String groupId) {
        AtomicReference<ErrorCodes> error = new AtomicReference<>();

        playerRepository.findById(id).ifPresentOrElse(player -> {
            var season = seasonRepository.findById(seasonId).orElse(null);

            if (season == null) {
                error.set(ErrorCodes.SEASON_NOT_FOUND);
                return;
            }

            if (!season.getGroupId().equals(groupId)) {
                error.set(ErrorCodes.SEASON_NOT_OF_GROUP);
                return;
            }

            if (season.getEndDate() == null) {
                if (player.getSeason().getId().equals(seasonId) && player.getSeason().getGroupId().equals(groupId)) {
                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PLAYER_DELETE, groupId, createStatisticsEnrichedDto(player)));

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

    public void copyPlayersFromOldSeason(Season oldSeason, Season newSeason) {
        if (oldSeason == null || newSeason == null || !oldSeason.getGroupId().equals(newSeason.getGroupId())) {
            return;
        }

        getBySeasonId(oldSeason.getId()).forEach(oldPlayerDto -> {
            var player = playerMapper.playerDtoToPlayer(oldPlayerDto);
            player.setId(null);
            player.setSeason(newSeason);

            playerRepository.save(player);
        });
    }

    public PlayerDto createPlayer(Season season, Profile profile) {
        Player player = new Player();
        player.setProfile(profile);
        player.setSeason(season);
        return playerMapper.playerToPlayerDto(playerRepository.save(player));
    }

    private PlayerDto createStatisticsEnrichedDto(Player player) {
        player.setStatistics(playerRepository.getStatisticsForPlayer(player.getId()));
        return playerMapper.playerToPlayerDto(player);
    }
}