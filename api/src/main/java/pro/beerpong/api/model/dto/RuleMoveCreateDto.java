package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class RuleMoveCreateDto {
    private String name;
    private int pointsForTeam;
    private int pointsForScorer;
    private boolean finishingMove;

    public boolean invalidDto() {
        return this.name == null || this.name.trim().isEmpty() ||
                this.pointsForTeam < 0 || this.pointsForScorer < 0;
    }
}