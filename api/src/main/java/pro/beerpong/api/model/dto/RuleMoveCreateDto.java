package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class RuleMoveCreateDto {
    private String name;
    private int pointsForTeam;
    private int pointsForScorer;
    private boolean isFinish;
}