package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class GroupPreset {
    private final String id;
    private final String title;
    private final String imageUrl;
}
