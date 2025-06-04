package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.AssetMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetCropDto;
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

    public Asset map(AssetMetadataDto dto) {
        return assetMapper.assetMetadataDtoToAsset(dto);
    }

    public AssetMetadataDto storeAsset(AssetType assetType, @Nullable AssetCropDto assetCropDto) {
        if (assetCropDto != null) {
            return this.storeAsset(assetType, assetCropDto.getOffsetX(), assetCropDto.getOffsetY(), assetCropDto.getZoom());
        } else {
            return this.storeAsset(assetType);
        }
    }

    public AssetMetadataDto storeAsset(AssetType assetType) {
        return this.storeAsset(assetType, 0.0D, 0.0D, 0.0D);
    }

    public AssetMetadataDto storeAsset(AssetType assetType, double offsetX, double offsetY, double zoom) {
        var asset = new Asset();
        asset.setType(assetType);
        asset.setUploadedAt(ZonedDateTime.now());
        asset.setOffsetX(offsetX);
        asset.setOffsetY(offsetY);
        asset.setZoom(zoom);

        return assetMapper.assetToAssetMetadataDto(assetRepository.save(asset));
    }
}