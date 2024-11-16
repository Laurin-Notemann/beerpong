package pro.beerpong.api.model.dto;

import lombok.Data;
import pro.beerpong.api.model.dao.Season;

@Data
public class RuleMoveDto {
    private String id;
    private String name;
    private int pointsForTeam;
    private int pointsForScorer;
    private boolean isFinish;
    private Season season;
}