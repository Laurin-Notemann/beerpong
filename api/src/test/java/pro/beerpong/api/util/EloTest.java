package pro.beerpong.api.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import com.google.api.client.util.Lists;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;

import pro.beerpong.api.model.dto.PlayerStatisticsDto;

public class EloTest {
  private static final Gson GSON = new GsonBuilder().create();

  @Test
  public void testElo() {
    var classLoader = getClass().getClassLoader();

    try (InputStream inputStream = classLoader.getResourceAsStream("testcases.json")) {
      assertNotNull(inputStream, "Resource not found!");
      String content = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
      List<TestGameData> games = Lists.newArrayList();

      for (JsonElement jsonElement : GSON.fromJson(content, JsonArray.class)) {
        games.add(GSON.fromJson(jsonElement.getAsJsonObject(), TestGameData.class));
      }

      assertEquals(26, games.size());

      var players = games.stream()
              .flatMap(gameData -> gameData.getTeams().stream())
              .flatMap(testGameTeam -> testGameTeam.getPlayers().stream())
              .toList();

      var playerStats = new HashMap<String, PlayerStatisticsDto>();

      players.stream()
              .map(TestGamePlayer::getPlayerName)
              .distinct()
              .forEach(s -> playerStats.put(s, buildTestDto(s)));

      for (TestGameData game : games) {
        if (game.getTeams().size() != 2) {
          continue;
        }

        var totalPointsBlue = game.getTeams().getFirst().getPlayers().stream()
                .mapToInt(TestGamePlayer::getPoints)
                .sum();
        var totalPointsRed = game.getTeams().get(1).getPlayers().stream()
                .mapToInt(TestGamePlayer::getPoints)
                .sum();

        var playerPoints = game.getTeams().stream()
                .flatMap(testGameTeam -> testGameTeam.getPlayers().stream())
                .collect(Collectors.toMap(testGamePlayer -> playerStats.get(testGamePlayer.getPlayerName()).getId(),
                        o -> (long) o.getPoints(), Long::sum));

        var teamBluePlayers = game.getTeams().getFirst().getPlayers().stream()
                .map(testGamePlayer -> playerStats.get(testGamePlayer.getPlayerName()))
                .toList();
        var teamRedPlayers = game.getTeams().get(1).getPlayers().stream()
                .map(testGamePlayer -> playerStats.get(testGamePlayer.getPlayerName()))
                .toList();

        var teamBlueAvg = game.getTeams().getFirst().getPlayers().stream()
                .mapToDouble(value -> playerStats.get(value.getPlayerName()).getElo())
                .average()
                .orElse(EloAlgorithm.STARTING_ELO);
        var teamRedAvg = game.getTeams().get(1).getPlayers().stream()
                .mapToDouble(value -> playerStats.get(value.getPlayerName()).getElo())
                .average()
                .orElse(EloAlgorithm.STARTING_ELO);

        double expectedBlue = EloAlgorithm.expectedScore(teamBlueAvg, teamRedAvg);
        double expectedRed = 1.0 - expectedBlue;
        double resultBlue = totalPointsBlue == totalPointsRed ? 0.5 : (totalPointsBlue > totalPointsRed ? 1.0 : 0.0);
        double resultRed = 1.0 - resultBlue;

        var eloBefore = game.getTeams().stream()
                .flatMap(testGameTeam -> testGameTeam.getPlayers().stream())
                .collect(Collectors.toMap(TestGamePlayer::getPlayerName, o -> playerStats.get(o.getPlayerName()).getElo()));

        EloAlgorithm.calculateElo(
                totalPointsBlue,
                totalPointsRed,
                teamBluePlayers,
                teamRedPlayers,
                playerPoints
        );

        var expShare = new HashMap<String, Double>();
        var actShare = new HashMap<String, Double>();

        EloAlgorithm.expectedShare(teamBluePlayers, expShare);
        EloAlgorithm.expectedShare(teamRedPlayers, expShare);
        System.out.println("--");
        EloAlgorithm.actualShare(teamBluePlayers, playerPoints, totalPointsBlue, actShare);
        EloAlgorithm.actualShare(teamRedPlayers, playerPoints, totalPointsRed, actShare);

        System.out.println("------------------------------");
        System.out.println("game: " + game.getMatchId());
        System.out.println();
        System.out.println("team blue (points: " + totalPointsBlue + " avg: " + round(teamBlueAvg) + " exp: " + round(expectedBlue) + " act: " + resultBlue + ")");

        for (TestGamePlayer player : game.getTeams().getFirst().getPlayers()) {
          var stats = playerStats.get(player.getPlayerName());
          var points = player.getPoints();
          var eloDiff = stats.getElo() - eloBefore.get(player.getPlayerName());

          System.out.println("  " + player.getPlayerName() + ":" +
                  " points: " + points +
                  " elo before: " + round(eloBefore.get(player.getPlayerName())) +
                  " elo after: " + round(stats.getElo()) +
                  " elo " + (eloDiff >= 0 ? "gain: +" : "loss: ") + round(eloDiff) +
                  " exp share: " + round(expShare.get(stats.getId())) +
                  " act share: " + round(actShare.get(stats.getId())));
        }

        System.out.println();

        System.out.println("team red (points: " + totalPointsRed + " avg: " + round(teamRedAvg) + " exp: " + round(expectedRed) + " act: " + resultRed + ")");

        for (TestGamePlayer player : game.getTeams().get(1).getPlayers()) {
          var stats = playerStats.get(player.getPlayerName());
          var points = player.getPoints();
          var eloDiff = stats.getElo() - eloBefore.get(player.getPlayerName());

          System.out.println("  " + player.getPlayerName() + ":" +
                  " points: " + points +
                  " elo before: " + round(eloBefore.get(player.getPlayerName())) +
                  " elo after: " + round(stats.getElo()) +
                  " elo " + (eloDiff >= 0 ? "gain: +" : "loss: ") + round(eloDiff) +
                  " exp share: " + round(expShare.get(stats.getId())) +
                  " act share: " + round(actShare.get(stats.getId())));
        }
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private double round(double d) {
    return Math.round(d * 100.0) / 100.0;
  }

  private PlayerStatisticsDto buildTestDto(String playerName) {
    PlayerStatisticsDto dto = new PlayerStatisticsDto();
    dto.setId(playerName);
    return dto;
  }
}
