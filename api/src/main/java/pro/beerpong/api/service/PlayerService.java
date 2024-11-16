package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.PlayerMapper;
import pro.beerpong.api.model.dao.Player;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dao.Season;
import pro.beerpong.api.model.dto.PlayerDto;
import pro.beerpong.api.repository.PlayerRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.repository.SeasonRepository;

import java.util.List;
import java.util.stream.Collectors;

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

    public List<PlayerDto> copyPlayersFromOldSeason(String oldSeasonId, String newSeasonId) {
        Season oldSeason = seasonRepository.findById(oldSeasonId)
                .orElseThrow(() -> new IllegalArgumentException("Old season not found: " + oldSeasonId));

        Season newSeason = seasonRepository.findById(newSeasonId)
                .orElseThrow(() -> new IllegalArgumentException("New season not found: " + newSeasonId));

        List<Player> oldSeasonPlayers = playerRepository.findAllBySeasonId(oldSeasonId);

        List<Player> newSeasonPlayers = oldSeasonPlayers.stream()
                .map(oldPlayer -> {
                    Player newPlayer = new Player();
                    newPlayer.setProfile(oldPlayer.getProfile());
                    newPlayer.setSeason(newSeason);
                    return playerRepository.save(newPlayer);
                })
                .toList();

        return newSeasonPlayers.stream()
                .map(playerMapper::playerToPlayerDto)
                .collect(Collectors.toList());
    }

    public PlayerDto createPlayer(Season season, Profile profile) {
        Player player = new Player();
        player.setProfile(profile);
        player.setSeason(season);
        return playerMapper.playerToPlayerDto(playerRepository.save(player));
    }

}
