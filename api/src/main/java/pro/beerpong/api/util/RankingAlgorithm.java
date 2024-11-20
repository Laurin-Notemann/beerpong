package pro.beerpong.api.util;

public enum RankingAlgorithm {
    AVERAGE,
    ELO;

    public String getId() {
        return this.name().toLowerCase();
    }
}
