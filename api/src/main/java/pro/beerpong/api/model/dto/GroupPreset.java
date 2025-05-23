package pro.beerpong.api.model.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Objects;

@Getter
@RequiredArgsConstructor
public class GroupPreset {
    private final String id;
    private final String title;
    private final String imageUrl;

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        GroupPreset that = (GroupPreset) o;
        return Objects.equals(id, that.id) && Objects.equals(title, that.title) && Objects.equals(imageUrl, that.imageUrl);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, title, imageUrl);
    }
}
