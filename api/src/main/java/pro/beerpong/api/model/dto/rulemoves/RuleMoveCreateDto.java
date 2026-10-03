package pro.beerpong.api.model.dto.rulemoves;

import lombok.Data;

@Data
public class RuleMoveCreateDto {
    private String name;
    private int pointsForTeam;
    private int pointsForScorer;
    private boolean finishingMove;
    /** cups this move takes off the table; older apps don't send it (see RuleMoveCups) */
    private Integer cups;

    public boolean invalidDto() {
        return this.name == null ||
                this.name.trim().isEmpty() ||
                this.pointsForTeam < 0 ||
                this.pointsForScorer < 0 ||
                (this.cups != null && this.cups < 0);
    }
}