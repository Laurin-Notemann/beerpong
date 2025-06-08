package pro.beerpong.api.mapping;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.util.UriComponentsBuilder;
import pro.beerpong.api.config.ApiProperties;
import pro.beerpong.api.model.dao.Asset;
import pro.beerpong.api.model.dao.GroupMember;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.GroupMemberDto;

@Mapper(componentModel = "spring")
public abstract class AssetAuthMapper {
    @Autowired
    private ApiProperties apiProperties;

    @Mapping(target = "url", expression = "java(generateUrl(asset))")
    public abstract AssetMetadataDto assetToAssetMetadataDto(Asset asset);

    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "user.id", target = "userId")
    public abstract GroupMemberDto groupMemberToGroupMemberDto(GroupMember groupMember);

    protected String generateUrl(Asset asset) {
        return UriComponentsBuilder.fromHttpUrl(apiProperties.getApiBaseUrl())
                .pathSegment("assets")
                .pathSegment(asset.getId())
                .pathSegment("data")
                .toUriString();
    }
}
