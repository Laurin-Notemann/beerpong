package pro.beerpong.api.util;

public enum DailyLeaderboard {
    RESET_AT_MIDNIGHT,
    WAKE_TIME,
    LAST_24_HOURS;

    public String getId() {
        return this.name().toLowerCase();
    }
}
