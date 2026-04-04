package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.mapping.PlayerStatisticsMapper;
import pro.beerpong.api.model.DefaultServiceResponse;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.PlayerStatistics;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.ServiceResponse;
import pro.beerpong.api.model.dto.player.PlayerDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.PlayerStatisticsRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class PlayerService {
    private final SubscriptionHandler subscriptionHandler;

    private final PlayerRepository playerRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerStatisticsRepository playerStatisticsRepository;

    private final PlayerMapper playerMapper;

// TODO   public List<PlayerDto> getBySeasonId(String seasonId) {
//        return this.getBySeasonId(seasonId, false);
//    }
//
// TODO   public List<PlayerDto> getBySeasonId(String seasonId, boolean showInactive) {
//        return playerRepository.findBySeasonId(seasonId)
//                .stream()
//                .filter(player -> showInactive || player.isActiveThisSeason())
//                .map(this::mapPlayer)
//                .toList();
//    }

    public Optional<Player> findLatestPlayer(String profileId) {
        return playerRepository.findLatestByProfileId(profileId);
    }

    public DefaultServiceResponse reactivatePlayer(String playerId) {
        var optional = playerRepository.findById(playerId);

        if (optional.isEmpty()) {
            return DefaultServiceResponse.error(ErrorCodes.PLAYER_NOT_FOUND);
        }

        var player = optional.get();

        if (player.isActiveThisSeason()) {
            return DefaultServiceResponse.error(ErrorCodes.PLAYER_ALREADY_DELETED);
        }

        player.setActiveThisSeason(true);

        playerRepository.save(player);

        return DefaultServiceResponse.ok();
    }

    public DefaultServiceResponse deletePlayer(String playerId, String groupId) {
        var playerOptional = playerRepository.findById(playerId);

        if (playerOptional.isEmpty()) {
            return DefaultServiceResponse.error(ErrorCodes.PLAYER_NOT_FOUND);
        }

        var player = playerOptional.get();

        if (!player.isActiveThisSeason()) {
            return DefaultServiceResponse.error(ErrorCodes.PLAYER_ALREADY_DELETED);
        }

        var season = player.getSeason();

        if (!season.getGroup().getId().equals(groupId)) {
            return DefaultServiceResponse.error(ErrorCodes.PLAYER_NOT_OF_GROUP);
        }

        if (season.getEndDate() == null) {
            subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PLAYER_DELETE, groupId, mapPlayer(player)));

            player.setActiveThisSeason(false);
            playerRepository.save(player);
        } else {
            return DefaultServiceResponse.error(ErrorCodes.SEASON_ALREADY_ENDED);
        }

        return DefaultServiceResponse.ok();
    }

    public PlayerDto createPlayer(Season season, Profile profile, @Nullable Player lastPlayer) {
        Player player = new Player(
                null,
                profile,
                season,
                null,
                true
        );

        if (lastPlayer != null) {
            var stats = new PlayerStatistics(lastPlayer.getStatistics());

            player.setStatistics(stats);
        } else {
            player.setStatistics(new PlayerStatistics());
        }

        playerStatisticsRepository.save(player.getStatistics());

        return playerMapper.playerToPlayerDto(playerRepository.save(player));
    }

    private PlayerDto mapPlayer(Player player) {
        return playerMapper.playerToPlayerDto(player);
    }
}