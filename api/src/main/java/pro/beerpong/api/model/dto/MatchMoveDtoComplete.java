package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class MatchMoveDtoComplete {
    @NotNull
    private String id; // ID der Spielbewegung
    @NotNull
    private int value; // Anzahl der Bewegungen
    @NotNull
    private String teamMemberId; // ID des Teammitglieds
    @NotNull
    private String moveId; // ID der Regelbewegung
}
