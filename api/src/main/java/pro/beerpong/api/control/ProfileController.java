package pro.beerpong.api.control;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;
import pro.beerpong.api.model.dto.ResponseEnvelope;
import pro.beerpong.api.service.ProfileService;

import java.util.List;

@RestController
@RequestMapping("/profiles")
public class ProfileController {

    private final ProfileService profileService;

    @Autowired
    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping
    public ResponseEntity<ResponseEnvelope<ProfileDto>> createProfile(@RequestBody ProfileCreateDto profileCreateDto) {
        ProfileDto savedProfile = profileService.createProfile(profileCreateDto);
        return ResponseEntity.ok(
                new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), savedProfile, null)
        );
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<ProfileDto>>> getAllProfiles() {
        List<ProfileDto> profiles = profileService.getAllProfiles();
        return ResponseEntity.ok(
                new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), profiles, null)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> getProfileById(@PathVariable String id) {
        ProfileDto profile = profileService.getProfileById(id);
        if (profile != null) {
            return ResponseEntity.ok(
                    new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), profile, null)
            );
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    new ResponseEnvelope<>(ResponseEnvelope.Status.ERROR, HttpStatus.NOT_FOUND.value(),
                            new ResponseEnvelope.ErrorDetails("PROFILE_NOT_FOUND", "Profile not found"), null)
            );
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> updateProfile(
            @PathVariable String id,
            @RequestBody ProfileCreateDto profileCreateDto) {
        ProfileDto updatedProfile = profileService.updateProfile(id, profileCreateDto);
        if (updatedProfile != null) {
            return ResponseEntity.ok(
                    new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), updatedProfile, null)
            );
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    new ResponseEnvelope<>(ResponseEnvelope.Status.ERROR, HttpStatus.NOT_FOUND.value(),
                            new ResponseEnvelope.ErrorDetails("PROFILE_NOT_FOUND", "Profile not found"), null)
            );
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<Void>> deleteProfile(@PathVariable String id) {
        profileService.deleteProfile(id);
        return ResponseEntity.ok(
                new ResponseEnvelope<>(ResponseEnvelope.Status.OK, HttpStatus.OK.value(), null, null)
        );
    }
}
