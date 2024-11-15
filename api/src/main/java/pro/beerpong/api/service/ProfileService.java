package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.Group;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.ProfileRepository;
import pro.beerpong.api.mapping.ProfileMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final GroupRepository groupRepository;
    private final ProfileMapper profileMapper;

    @Autowired
    public ProfileService(ProfileRepository profileRepository, GroupRepository groupRepository, ProfileMapper profileMapper) {
        this.profileRepository = profileRepository;
        this.groupRepository = groupRepository;
        this.profileMapper = profileMapper;
    }

    public ProfileDto createProfile(ProfileCreateDto profileCreateDto) {
        Optional<Group> groupOptional = groupRepository.findById(profileCreateDto.getGroupId());
        if (groupOptional.isEmpty()) {
            throw new IllegalArgumentException("Group not found with ID: " + profileCreateDto.getGroupId());
        }

        Profile profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);
        profile.setGroup(groupOptional.get());

        Profile savedProfile = profileRepository.save(profile);
        return profileMapper.profileToProfileDto(savedProfile);
    }

    public List<ProfileDto> getAllProfiles() {
        return profileRepository.findAll()
                .stream()
                .map(profileMapper::profileToProfileDto)
                .collect(Collectors.toList());
    }

    public ProfileDto getProfileById(String id) {
        return profileRepository.findById(id)
                .map(profileMapper::profileToProfileDto)
                .orElse(null);
    }

    public void deleteProfile(String id) {
        profileRepository.deleteById(id);
    }

    // Neue Methode: Profil aktualisieren
    public ProfileDto updateProfile(String id, ProfileCreateDto profileCreateDto) {
        return profileRepository.findById(id)
                .map(existingProfile -> {
                    existingProfile.setName(profileCreateDto.getName());
                    existingProfile.setProfilePicture(profileCreateDto.getProfilePicture());

                    // Überprüfen, ob die Gruppe geändert werden soll
                    if (profileCreateDto.getGroupId() != null) {
                        groupRepository.findById(profileCreateDto.getGroupId()).ifPresent(existingProfile::setGroup);
                    }

                    Profile updatedProfile = profileRepository.save(existingProfile);
                    return profileMapper.profileToProfileDto(updatedProfile);
                })
                .orElse(null);
    }
}
