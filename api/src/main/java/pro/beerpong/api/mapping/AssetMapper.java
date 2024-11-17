package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dto.AssetMetadataDto;

@Mapper(componentModel = "spring")
public interface AssetMapper {
    AssetMetadataDto assetToAssetMetadataDto(Asset asset);
}
