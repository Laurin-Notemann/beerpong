package pro.beerpong.api.util;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Getter
public class TestGameTeam {
  private String teamId;
  private List<TestGamePlayer> players;
}
