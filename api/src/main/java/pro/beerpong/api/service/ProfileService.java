package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.ProfileMapper;
import pro.beerpong.api.model.dao.Profile;
import pro.beerpong.api.model.dto.ProfileCreateDto;
import pro.beerpong.api.model.dto.ProfileDto;
import pro.beerpong.api.repository.GroupRepository;
import pro.beerpong.api.repository.ProfileRepository;

import java.util.List;
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

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto) {
        var groupOptional = groupRepository.findById(groupId);

        var profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);
        profile.setGroup(groupOptional.orElseThrow());

        var savedProfile = profileRepository.save(profile);
        return profileMapper.profileToProfileDto(savedProfile);
    }

    public List<ProfileDto> listAllProfiles() {
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

    public ProfileDto updateProfile(String groupId, String id, ProfileCreateDto profileCreateDto) {
        var profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);
        profile.setGroup(groupRepository.findById(groupId).orElseThrow());
        profile.setId(id);
        return profileMapper.profileToProfileDto(profileRepository.save(profile));
    }
}