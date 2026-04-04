package pro.beerpong.api.model.dto.groups;

import lombok.Data;

import java.util.List;

@Data
public class GroupCreateDto {
    public static final int GROUP_NAME_MIN_LENGTH = 2;
    public static final int GROUP_NAME_MAX_LENGTH = 50;

    private String name;
    private List<String> profileNames;
    private String sportPreset;
    private String customSportName;

    public boolean invalidName() {
        return this.name == null || this.name.trim().isEmpty() ||
                this.name.length() < GROUP_NAME_MIN_LENGTH || this.name.length() > GROUP_NAME_MAX_LENGTH;
    }

    public boolean invalidProfileName() {
        return this.profileNames == null || this.profileNames.isEmpty() ||
                this.profileNames.stream().anyMatch(s -> this.profileNames.stream().filter(s1 -> s1.equals(s)).count() > 1);
    }
}
