package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.AssetMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetCropDto;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.AssetUploadResponse;
import pro.beerpong.api.repository.AssetRepository;
import pro.beerpong.api.util.AssetType;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AssetService {
    private final S3Presigner presigner;
    private final S3Client client;
    @Value("${app.aws.bucket}")
    private String bucket;

    private final AssetMapper assetMapper;
    private final AssetRepository assetRepository;

    public boolean assetExists(String assetId) {
        return assetRepository.existsById(assetId);
    }

    public void deleteAsset(String assetId) {
        client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(assetId)
                .build());

        assetRepository.deleteById(assetId);
    }

    public AssetMetadataDto getAssetData(String assetId) {
        return assetMapper.assetToAssetMetadataDto(assetRepository.findById(assetId).orElse(null));
    }

    public Asset map(AssetMetadataDto dto) {
        return assetMapper.assetMetadataDtoToAsset(dto);
    }

    public AssetUploadResponse storeAsset(AssetType assetType, @Nullable AssetCropDto assetCropDto) {
        if (assetCropDto != null) {
            return this.storeAsset(assetType, assetCropDto.getOffsetX(), assetCropDto.getOffsetY(),
                    assetCropDto.getZoom());
        } else {
            return this.storeAsset(assetType);
        }
    }

    public AssetUploadResponse storeAsset(AssetType assetType) {
        return this.storeAsset(assetType, 0.0D, 0.0D, 0.0D);
    }

    public AssetUploadResponse storeAsset(AssetType assetType, double offsetX, double offsetY, double zoom) {
        var asset = new Asset();
        asset.setType(assetType);
        asset.setOffsetX(offsetX);
        asset.setOffsetY(offsetY);
        asset.setZoom(zoom);

        asset = assetRepository.save(asset);

        // TODO check contentType
        return createPutUpload(assetRepository.save(asset), "png");
    }

    public AssetUploadResponse createPutUpload(Asset asset, String contentType) {
        var putReq = PutObjectRequest.builder()
                .bucket(bucket)
                .key(asset.getId())
                .contentType(contentType)
                .build();

        var presigned = presigner.presignPutObject(b -> b
                .signatureDuration(Duration.ofMinutes(5))
                .putObjectRequest(putReq));

        var response = new AssetUploadResponse();
        response.setId(asset.getId());
        response.setUrl("s3://" + bucket + "/" + asset.getId());
        response.setSingleUploadUrl(presigned.url().toString());

        response.setZoom(asset.getZoom());
        response.setOffsetX(asset.getOffsetX());
        response.setOffsetY(asset.getOffsetY());

        response.setType(asset.getType());

        return response;
    }
}