package pro.beerpong.api.model.dto;

import lombok.Data;

import java.util.List;

@Data
public class GroupCreateDto {
    private String name;
    private List<String> playerNames;
}
