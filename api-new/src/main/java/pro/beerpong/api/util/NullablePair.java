package pro.beerpong.api.util;

import org.springframework.lang.Nullable;

public class NullablePair<S, T> {
    private final @Nullable S first;
    private final @Nullable T second;

    private NullablePair(@Nullable S first, @Nullable T second) {
        this.first = first;
        this.second = second;
    }

    public static <S, T> NullablePair<S, T> of(@Nullable S first, @Nullable T second) {
        return new NullablePair<>(first, second);
    }

    public S getFirst() {
        return this.first;
    }

    public T getSecond() {
        return this.second;
    }
}
