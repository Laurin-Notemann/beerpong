package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Value;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.model.dto.assets.AssetUploadResponse;

@Mapper(componentModel = "spring")
public abstract class AssetMapper {
    @Value("${app.aws.bucket}")
    private String bucket;
    @Value("${app.aws.endpoint}")
    private String endpoint;

    @Mapping(target = "url", expression = "java(generateUrl(asset))")
    public abstract AssetMetadataDto assetToAssetMetadataDto(Asset asset);

    public abstract Asset assetMetadataDtoToAsset(AssetMetadataDto dto);

    @Mapping(target = "url", expression = "java(generateUrl(asset))")
    @Mapping(target = "singleUploadUrl", ignore = true)
    public abstract AssetUploadResponse assetToUploadResponse(Asset asset);

    public String generateUrl(Asset asset) {
        return "https://" + bucket + "." + endpoint + "/" + asset.getId();
    }
}
