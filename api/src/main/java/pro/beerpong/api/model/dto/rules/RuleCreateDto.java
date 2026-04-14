package pro.beerpong.api.model.dto.rules;

import lombok.Data;

@Data
public class RuleCreateDto {
    private String title;
    private String description;

    public boolean invalidDto() {
        return this.title == null ||
                this.title.trim().isEmpty() ||
                this.description == null ||
                this.description.trim().isEmpty();
    }
}