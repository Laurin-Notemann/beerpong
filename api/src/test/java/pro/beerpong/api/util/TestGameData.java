package pro.beerpong.api.util;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
public class TestGameData {
  private String matchId;
  private List<TestGameTeam> teams;
}
