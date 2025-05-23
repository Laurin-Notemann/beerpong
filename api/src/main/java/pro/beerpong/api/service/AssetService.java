package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.AssetMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.repository.AssetRepository;
import pro.beerpong.api.util.AssetType;

import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class AssetService {
    private final AssetMapper assetMapper;
    private final AssetRepository assetRepository;

    public boolean assetExists(String assetId) {
        return assetRepository.existsById(assetId);
    }

    public void deleteAsset(String assetId) {
        assetRepository.deleteById(assetId);
    }

    public AssetMetadataDto getAssetData(String assetId) {
        return assetMapper.assetToAssetMetadataDto(assetRepository.findById(assetId).orElse(null));
    }

    public AssetMetadataDto storeAsset(AssetType assetType) {
        var asset = new Asset();
        asset.setType(assetType);
        asset.setUploadedAt(ZonedDateTime.now());

        return assetMapper.assetToAssetMetadataDto(assetRepository.save(asset));
    }
}