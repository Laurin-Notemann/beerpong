package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Asset;

public interface AssetRepository extends JpaRepository<Asset, String> {
}