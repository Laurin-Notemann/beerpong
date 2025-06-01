package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.model.dao.*;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.PlayerCreateDto;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.PlayerStatisticsRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.repository.SeasonRepository;
import pro.beerpong.api.sockets.SocketEvent;
import pro.beerpong.api.sockets.SocketEventData;
import pro.beerpong.api.sockets.SubscriptionHandler;

import java.util.Comparator;
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
    private final PlayerStatisticsRepository playerStatisticsRepository;

    public List<PlayerDto> getBySeasonId(String seasonId) {
        return this.getBySeasonId(seasonId, false);
    }

    public List<PlayerDto> getBySeasonId(String seasonId, boolean showInactive) {
        return playerRepository.findAllBySeasonId(seasonId)
                .stream()
                .filter(player -> showInactive || player.isActiveThisSeason())
                .map(this::mapPlayer)
                .toList();
    }

    public Player findLatestPlayer(String profileId) {
        return playerRepository.findAllByProfileId(profileId)
                .stream()
                .sorted(Comparator.comparing(player -> player.getSeason().getStartDate()))
                .toList()
                .getLast();
    }

    public boolean reactivatePlayer(PlayerDto dto) {
        if (dto.isActiveThisSeason()) {
            return false;
        }

        dto.setActiveThisSeason(true);

        playerRepository.save(playerMapper.playerDtoToPlayer(dto));

        return true;
    }

    public ErrorCodes deletePlayer(String id, String seasonId, String groupId) {
        AtomicReference<ErrorCodes> error = new AtomicReference<>();

        playerRepository.findById(id).ifPresentOrElse(player -> {
            var season = seasonRepository.findById(seasonId).orElse(null);

            if (!player.isActiveThisSeason()) {
                error.set(ErrorCodes.PLAYER_ALREADY_DELETED);
                return;
            }

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
                    subscriptionHandler.callEvent(new SocketEvent<>(SocketEventData.PLAYER_DELETE, groupId, mapPlayer(player)));

                    player.setActiveThisSeason(false);
                    playerRepository.save(player);
                } else {
                    error.set(ErrorCodes.PLAYER_VALIDATION_FAILED);
                }
            } else {
                error.set(ErrorCodes.SEASON_ALREADY_ENDED);
            }
        }, () -> error.set(ErrorCodes.PLAYER_NOT_FOUND));

        return error.get();
    }

    public PlayerDto createPlayer(Season season, Profile profile) {
        Player player = new Player();
        player.setProfile(profile);
        player.setSeason(season);
        player.setActiveThisSeason(true);
        player.setStatistics(new PlayerStatistics());

        playerStatisticsRepository.save(player.getStatistics());

        return playerMapper.playerToPlayerDto(playerRepository.save(player));
    }

    private PlayerDto mapPlayer(Player player) {
        return playerMapper.playerToPlayerDto(player);
    }
}