package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class RuleDto {
    private String id;
    private String title;
    private String description;
    private SeasonDto season;
    private GroupMemberDto createdBy;
}