package pro.beerpong.api.model.dto.rules;

import lombok.Data;

@Data
public class RuleDto {
    private String id;
    private String title;
    private String description;
    private String createdById;
    private String seasonId;
}