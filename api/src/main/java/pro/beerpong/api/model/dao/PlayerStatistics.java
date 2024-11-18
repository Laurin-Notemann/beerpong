package pro.beerpong.api.model.dao;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PlayerStatistics {
    private long points;
    private long matches;
}