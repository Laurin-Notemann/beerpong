package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.User;

public interface AssetRepository extends JpaRepository<Asset, String> {
}
