package pro.beerpong.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pro.beerpong.api.model.dao.Device;
import pro.beerpong.api.model.dao.User;

public interface DeviceRepository extends JpaRepository<Device, String> {
}