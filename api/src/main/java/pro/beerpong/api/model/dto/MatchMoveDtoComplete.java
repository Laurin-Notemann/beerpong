package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class MatchMoveDtoComplete {
    private String id; // ID der Spielbewegung
    private int value; // Anzahl der Bewegungen
    private String teamMemberId; // ID des Teammitglieds
    private String moveId; // ID der Regelbewegung
}
