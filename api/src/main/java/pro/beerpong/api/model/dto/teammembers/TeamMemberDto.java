package pro.beerpong.api.model.dto.teammembers;

import lombok.Data;

@Data
public class TeamMemberDto {
    private String id;
    private String teamId;
    private String playerId;
}
