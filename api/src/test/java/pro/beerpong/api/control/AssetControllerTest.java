package pro.beerpong.api.control;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class AssetControllerTest {
    /*
    TODO needs s3 files
    @LocalServerPort
    private int port;

    @Autowired
    private TestUtils testUtils;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    public void createTransaction() {
        transactionManager.getTransaction(new DefaultTransactionDefinition()).setRollbackOnly();
    }

    @Test
    @SuppressWarnings("unchecked")
    public void assets_groupWallpaper_success() {
        var createDto = new GroupCreateDto();
        createDto.setProfileNames(List.of("player1", "player2"));
        createDto.setName("test");
        createDto.setSportPreset("beerpong");

        var groupResponse = testUtils.performPost(port, "/groups", createDto, GroupDto.class);
        var group = testUtils.assertSuccess(groupResponse, GroupDto.class);

        var response = testUtils.performPut(port, "/groups/" + group.getId(), group, AssetMetadataDto.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void whenGettingAsset_ThenIsSuccessful() {
        var prerequisiteResponse = testUtils.performPost(port, "/assets", new byte[] {-128, 0, 127, 0}, AssetMetadataDto.class);

        assertNotNull(prerequisiteResponse);
        assertEquals(200, prerequisiteResponse.getStatusCode().value());

        var prerequisiteEnvelope = (ResponseEnvelope<AssetMetadataDto>) prerequisiteResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteAssetMetadata = prerequisiteEnvelope.getData();

        assertNotNull(prerequisiteAssetMetadata);
        assertNotNull(prerequisiteAssetMetadata.getId());
        assertNotNull(prerequisiteAssetMetadata.getMediaType());
        assertEquals("application/octet-stream", prerequisiteAssetMetadata.getMediaType());
        assertNotNull(prerequisiteAssetMetadata.getUploadedAt());
        assertTrue(60 > Duration.between(ZonedDateTime.now(),prerequisiteAssetMetadata.getUploadedAt()).getSeconds());

        var response = testUtils.performGet(port, "/assets/" + prerequisiteAssetMetadata.getId(), AssetMetadataDto.class);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        var envelope = (ResponseEnvelope<AssetMetadataDto>) response.getBody();
        assertNotNull(envelope);
        assertEquals(ResponseEnvelope.Status.OK, envelope.getStatus());
        assertNull(envelope.getError());
        assertEquals(200, envelope.getHttpCode());

        var assetMetadata = envelope.getData();
        assertNotNull(assetMetadata);
        assertNotNull(assetMetadata.getId());
        assertEquals(prerequisiteAssetMetadata.getId(), assetMetadata.getId());
        assertNotNull(assetMetadata.getMediaType());
        assertEquals(prerequisiteAssetMetadata.getMediaType(), assetMetadata.getMediaType());
        assertNotNull(assetMetadata.getUploadedAt());
        assertTrue(60 > Duration.between(assetMetadata.getUploadedAt(),prerequisiteAssetMetadata.getUploadedAt()).getSeconds());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void whenFetchingAssetData_ThenIsSuccessful() {
        byte[] assetToBeStored = {-128, 0, 127, 0};
        var prerequisiteResponse = testUtils.performPost(port, "/assets", assetToBeStored, AssetMetadataDto.class);

        assertNotNull(prerequisiteResponse);
        assertEquals(200, prerequisiteResponse.getStatusCode().value());

        var prerequisiteEnvelope = (ResponseEnvelope<AssetMetadataDto>) prerequisiteResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteAssetMetadata = prerequisiteEnvelope.getData();

        assertNotNull(prerequisiteAssetMetadata);
        assertNotNull(prerequisiteAssetMetadata.getId());
        assertNotNull(prerequisiteAssetMetadata.getMediaType());
        assertEquals("application/octet-stream", prerequisiteAssetMetadata.getMediaType());
        assertNotNull(prerequisiteAssetMetadata.getUploadedAt());
        assertTrue(60 > Duration.between(ZonedDateTime.now(),prerequisiteAssetMetadata.getUploadedAt()).getSeconds());

        var response = restTemplate.getForEntity("http://localhost:" + port + "/assets/" + prerequisiteAssetMetadata.getId() + "/data", byte[].class);
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getHeaders().getContentType());
        assertEquals("application/octet-stream", response.getHeaders().getContentType().toString());

        var asset = response.getBody();
        assertNotNull(asset);
        assertArrayEquals(assetToBeStored, asset);
    }

    @Test
    @SuppressWarnings("unchecked")
    public void whenDeletingAsset_ThenIsSuccessful() {
        var prerequisiteResponse = testUtils.performPost(port, "/assets", new byte[] {-128, 0, 127, 0}, AssetMetadataDto.class);

        assertNotNull(prerequisiteResponse);
        assertEquals(200, prerequisiteResponse.getStatusCode().value());

        var prerequisiteEnvelope = (ResponseEnvelope<AssetMetadataDto>) prerequisiteResponse.getBody();
        assertNotNull(prerequisiteEnvelope);
        assertEquals(ResponseEnvelope.Status.OK, prerequisiteEnvelope.getStatus());
        assertNull(prerequisiteEnvelope.getError());
        assertEquals(200, prerequisiteEnvelope.getHttpCode());

        var prerequisiteAssetMetadata = prerequisiteEnvelope.getData();

        assertNotNull(prerequisiteAssetMetadata);
        assertNotNull(prerequisiteAssetMetadata.getId());
        assertNotNull(prerequisiteAssetMetadata.getMediaType());
        assertEquals("application/octet-stream", prerequisiteAssetMetadata.getMediaType());
        assertNotNull(prerequisiteAssetMetadata.getUploadedAt());
        assertTrue(60 > Duration.between(ZonedDateTime.now(),prerequisiteAssetMetadata.getUploadedAt()).getSeconds());

        var response = testUtils.performDelete(port, "/assets/" + prerequisiteAssetMetadata.getId(), null, AssetMetadataDto.class);
        assertNotNull(response);
        assertEquals(204, response.getStatusCode().value());
    }*/
}