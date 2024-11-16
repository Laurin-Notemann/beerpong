package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class MatchMoveDto {
    private String moveId; // ID der Regelbewegung
    private int count; // Anzahl der Bewegungen
}
