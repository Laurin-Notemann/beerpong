package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pro.beerpong.api.mapping.AssetMapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.assets.AssetCropDto;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;
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
        return assetRepository.findById(assetId)
                .map(assetMapper::assetToAssetMetadataDto)
                .orElse(null);
    }

    public Asset map(AssetMetadataDto dto) {
        return assetMapper.assetMetadataDtoToAsset(dto);
    }

    public AssetUploadResponse storeAsset(AssetType assetType, @Nullable AssetCropDto assetCropDto) {
        if (assetCropDto != null) {
            return this.storeAsset(
                    assetType,
                    assetCropDto.getOffsetX(),
                    assetCropDto.getOffsetY(),
                    assetCropDto.getZoom()
            );
        } else {
            return this.storeAsset(assetType);
        }
    }

    public AssetUploadResponse storeAsset(AssetType assetType) {
        return this.storeAsset(assetType, 0.0D, 0.0D, 0.0D);
    }

    public AssetUploadResponse storeAsset(AssetType assetType, double offsetX, double offsetY, double zoom) {
        var asset = new Asset(
                null,
                assetType,
                offsetX,
                offsetY,
                zoom
        );

        asset = assetRepository.save(asset);

        return createPutUpload(asset, resolveImageContentType());
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
        var response = assetMapper.assetToUploadResponse(asset);

        response.setSingleUploadUrl(presigned.url().toString());

        return response;
    }

    private String resolveImageContentType() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            String contentType = servletAttrs.getRequest().getContentType();
            if (contentType != null) {
                String lower = contentType.toLowerCase();
                if (lower.startsWith("image/")) {
                    return contentType;
                }
            }
        }
        return "image/png";
    }
}