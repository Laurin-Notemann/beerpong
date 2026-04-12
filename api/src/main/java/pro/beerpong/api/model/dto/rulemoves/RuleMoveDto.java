package pro.beerpong.api.model.dto.rulemoves;

import lombok.Data;

@Data
public class RuleMoveDto {
    private String id;
    private String name;
    private String seasonId;
    private int pointsForTeam;
    private int pointsForScorer;
    private boolean finishingMove;
}