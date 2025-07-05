package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.util.UriComponentsBuilder;
import pro.beerpong.api.config.ApiProperties;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetMetadataDto;

@Mapper(componentModel = "spring")
public abstract class AssetMapper {
    @Autowired
    private ApiProperties apiProperties;

    @Mapping(target = "url", expression = "java(generateUrl(asset))")
    public abstract AssetMetadataDto assetToAssetMetadataDto(Asset asset);

    protected String generateUrl(Asset asset) {
        return UriComponentsBuilder.fromHttpUrl(apiProperties.getApiBaseUrl())
                .pathSegment("assets")
                .pathSegment(asset.getId())
                .pathSegment("data")
                .toUriString();
    }
}
