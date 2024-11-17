package pro.beerpong.api.control;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.AssetMetadataDto;
import pro.beerpong.api.model.dto.ErrorCodes;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.AssetService;

@RestController
@RequestMapping("/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService assetService;

    @DeleteMapping("{id}")
    public ResponseEntity<ResponseEnvelope<Object>> deleteAsset(@PathVariable String id) {
        if (!assetService.assetExists(id)) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND);
        }

        assetService.deleteAsset(id);

        return ResponseEnvelope.okNoContent();
    }

    @GetMapping("{id}")
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> getAsset(@PathVariable String id) {
        var assetMetadata = assetService.getAssetMetadata(id);

        if (assetMetadata == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND);
        }

        return ResponseEnvelope.ok(assetMetadata);
    }

    @GetMapping("{id}/data")
    public ResponseEntity<?> fetchData(@PathVariable String id) {
        var assetMetadata = assetService.getAssetMetadata(id);
        byte[] asset = assetService.fetchAsset(id);

        if (assetMetadata == null || asset == null) {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND);
        }

        return ResponseEntity.ok().contentType(MediaType.valueOf(assetMetadata.getMediaType()))
                .body(asset);
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<AssetMetadataDto>> uploadAsset(HttpServletRequest request, @RequestBody byte[] content) {
        return ResponseEnvelope.ok(assetService.storeAsset(content, request.getContentType()));
    }
}