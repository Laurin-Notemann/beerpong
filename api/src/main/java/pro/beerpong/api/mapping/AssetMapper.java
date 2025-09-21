package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Value;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetMetadataDto;

@Mapper(componentModel = "spring")
public abstract class AssetMapper {
    @Value("${app.aws.bucket}") private String bucket;

    @Mapping(target = "url", expression = "java(generateUrl(asset))")
    public abstract AssetMetadataDto assetToAssetMetadataDto(Asset asset);

    public abstract Asset assetMetadataDtoToAsset(AssetMetadataDto asset);

    protected String generateUrl(Asset asset) {
        return "s3://" + bucket + "/" + asset.getId();
    }
}
