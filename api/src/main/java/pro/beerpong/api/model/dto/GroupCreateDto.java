package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;
import java.util.regex.Pattern;

@Data
public class GroupCreateDto {
    private static final int GROUP_NAME_MIN_LENGTH = 2;
    private static final int GROUP_NAME_MAX_LENGTH = 30;
    private static final Pattern GROUP_NAME_PATTERN = Pattern.compile("[a-zA-Z0-9_-]*");

    private String name;
    private List<String> profileNames;

    public boolean invalidName() {
        return this.name == null || this.name.isEmpty() ||
                this.name.length() < GROUP_NAME_MIN_LENGTH || this.name.length() > GROUP_NAME_MAX_LENGTH ||
                !GROUP_NAME_PATTERN.matcher(this.name).matches();
    }

    public boolean invalidProfileName() {
        return this.profileNames == null || this.profileNames.isEmpty();
    }
}
