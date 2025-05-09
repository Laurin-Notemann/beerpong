package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;
import java.util.regex.Pattern;

@Data
public class GroupCreateDto {
    private static final int GROUP_NAME_MIN_LENGTH = 2;
    private static final int GROUP_NAME_MAX_LENGTH = 50;

    private String name;
    private List<String> profileNames;

    public boolean invalidName() {
        return this.name == null || this.name.isEmpty() ||
                this.name.length() < GROUP_NAME_MIN_LENGTH || this.name.length() > GROUP_NAME_MAX_LENGTH;
    }

    public boolean invalidProfileName() {
        return this.profileNames == null || this.profileNames.isEmpty();
    }
}
