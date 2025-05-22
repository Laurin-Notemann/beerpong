package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class SeasonCreateDto {
    public static final int SEASON_NAME_MIN_LENGTH = 2;
    public static final int SEASON_NAME_MAX_LENGTH = 50;

    private String oldSeasonName;
    private List<RuleMoveCreateDto> ruleMoves;

    public boolean invalidName() {
        return this.oldSeasonName == null || this.oldSeasonName.isEmpty() ||
                this.oldSeasonName.length() < SEASON_NAME_MIN_LENGTH ||
                this.oldSeasonName.length() > SEASON_NAME_MAX_LENGTH;
    }

    public boolean invalidRuleMoves() {
        return this.ruleMoves == null ||
                this.ruleMoves.stream().noneMatch(RuleMoveCreateDto::isFinishingMove) ||
                this.ruleMoves.stream()
                        .filter(RuleMoveCreateDto::isFinishingMove)
                        .count() == this.ruleMoves.size() ||
                this.ruleMoves.stream().anyMatch(RuleMoveCreateDto::invalidDto);
    }
}