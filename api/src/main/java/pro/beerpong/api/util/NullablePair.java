package pro.beerpong.api.util;

import lombok.Getter;

@Getter
public class NullablePair<S, T> {
    private final S first;
    private final T second;

    private NullablePair(S first, T second) {
        this.first = first;
        this.second = second;
    }

    public static <S, T> NullablePair<S, T> of(S first, T second) {
        return new NullablePair<>(first, second);
    }
}
