package pro.beerpong.api.control;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pro.beerpong.api.model.ErrorCodes;
import pro.beerpong.api.model.ResponseEnvelope;
import pro.beerpong.api.model.dto.assets.AssetMetadataDto;
import pro.beerpong.api.service.AssetService;

@RestController
@RequestMapping("/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService assetService;

    @GetMapping("{id}")
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> getAsset(@PathVariable String id) {
        var assetMetadata = assetService.getAssetData(id);

        if (assetMetadata == null) {
            return ResponseEnvelope.notOk(ErrorCodes.ASSET_NOT_FOUND);
        }

        return ResponseEnvelope.ok(assetMetadata);
    }

    //Direct access of writing (POST, DELETE) /assets isn't supported because writing interactions take place directly against business sub-resources
}