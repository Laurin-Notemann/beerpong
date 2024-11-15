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
        return ResponseEnvelope.ok(savedProfile);
    }

    @GetMapping
    public ResponseEntity<ResponseEnvelope<List<ProfileDto>>> getAllProfiles() {
        List<ProfileDto> profiles = profileService.getAllProfiles();
        return ResponseEnvelope.ok(profiles);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> getProfileById(@PathVariable String id) {
        ProfileDto profile = profileService.getProfileById(id);
        if (profile != null) {
            return ResponseEnvelope.ok(profile);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", "Profile not found");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<ProfileDto>> updateProfile(
            @PathVariable String id, @RequestBody ProfileCreateDto profileCreateDto) {
        ProfileDto updatedProfile = profileService.updateProfile(id, profileCreateDto);
        if (updatedProfile != null) {
            return ResponseEnvelope.ok(updatedProfile);
        } else {
            return ResponseEnvelope.notOk(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", "Profile not found");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseEnvelope<Void>> deleteProfile(@PathVariable String id) {
        profileService.deleteProfile(id);
        return ResponseEnvelope.ok(null);
    }
}
