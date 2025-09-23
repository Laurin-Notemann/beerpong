package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class TeamMemberDto {
    @NotNull
    private String id;
    @NotNull
    private String teamId;
    @NotNull
    private String playerId;
}
