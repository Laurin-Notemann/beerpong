package pro.beerpong.api.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

  public static void printTable(List<Map<String, Object>> rows) {
    if (rows == null || rows.isEmpty()) {
      System.out.println("(keine Daten)");
      return;
    }

    // Alle Spaltennamen sammeln
    Set<String> headers = new LinkedHashSet<>();
    for (Map<String, Object> row : rows) {
      headers.addAll(row.keySet());
    }

    // Spaltenbreiten berechnen
    Map<String, Integer> colWidths = new HashMap<>();
    for (String header : headers) {
      int max = header.length();
      for (Map<String, Object> row : rows) {
        Object value = row.get(header);
        if (value != null) {
          max = Math.max(max, value.toString().length());
        }
      }
      colWidths.put(header, max);
    }

    // Kopfzeile
    printSeparator(colWidths, headers);
    printRow(colWidths, headers, headers);
    printSeparator(colWidths, headers);

    // Datenzeilen
    for (Map<String, Object> row : rows) {
      List<String> values = new ArrayList<>();
      for (String header : headers) {
        Object value = row.get(header);
        values.add(value == null ? "" : value.toString());
      }
      printRow(colWidths, headers, values);
    }

    printSeparator(colWidths, headers);
  }

  private static void printRow(Map<String, Integer> colWidths, Set<String> headers, Collection<String> values) {
    Iterator<String> headerIter = headers.iterator();
    Iterator<String> valueIter = values.iterator();
    StringBuilder sb = new StringBuilder("|");
    while (headerIter.hasNext() && valueIter.hasNext()) {
      String header = headerIter.next();
      String value = valueIter.next();
      int width = colWidths.get(header);
      sb.append(" ").append(padRight(value, width)).append(" |");
    }
    System.out.println(sb.toString());
  }

  private static void printSeparator(Map<String, Integer> colWidths, Set<String> headers) {
    StringBuilder sb = new StringBuilder("+");
    for (String header : headers) {
      int width = colWidths.get(header);
      sb.append("-".repeat(width + 2)).append("+");
    }
    System.out.println(sb.toString());
  }

  private static String padRight(String text, int length) {
    if (text.length() >= length) {
      return text;
    }
    return text + " ".repeat(length - text.length());
  }

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
                .collect(Collectors.toMap(testGamePlayer -> playerStats.get(testGamePlayer.getPlayerName()),
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

        EloAlgorithm.calculateElo(
                totalPointsBlue,
                totalPointsRed,
                teamBluePlayers,
                teamRedPlayers,
                playerPoints
        );

        var expShare = new HashMap<PlayerStatisticsDto, Double>();
        var actShare = new HashMap<PlayerStatisticsDto, Double>();

        EloAlgorithm.expectedShare(teamBluePlayers, expShare);
        EloAlgorithm.expectedShare(teamRedPlayers, expShare);
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
                  " exp share: " + round(expShare.get(stats)) +
                  " act share: " + round(actShare.get(stats)));
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
                  " exp share: " + round(expShare.get(stats)) +
                  " act share: " + round(actShare.get(stats)));
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
