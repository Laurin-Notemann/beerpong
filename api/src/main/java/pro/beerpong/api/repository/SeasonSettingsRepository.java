package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.SeasonSettings;
import pro.beerpong.api.model.dao.User;

public interface SeasonSettingsRepository extends JpaRepository<SeasonSettings, String> {
}
