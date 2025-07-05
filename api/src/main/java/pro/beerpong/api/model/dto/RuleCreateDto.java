package pro.beerpong.api.model.dto;

import lombok.Data;

@Data
public class RuleCreateDto {
    private String title;
    private String description;
}