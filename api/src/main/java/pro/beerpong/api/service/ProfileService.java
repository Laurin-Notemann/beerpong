package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.GroupMapper;
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
    private final GroupMapper groupMapper;
    private final ProfileMapper profileMapper;
    private final PlayerService playerService;

    @Autowired
    public ProfileService(ProfileRepository profileRepository, GroupRepository groupRepository, GroupMapper groupMapper, ProfileMapper profileMapper,
                          PlayerService playerService) {
        this.profileRepository = profileRepository;
        this.groupRepository = groupRepository;
        this.groupMapper = groupMapper;
        this.profileMapper = profileMapper;
        this.playerService = playerService;
    }

    public ProfileDto createProfile(String groupId, ProfileCreateDto profileCreateDto) {
        var groupOptional = groupRepository.findById(groupId);

        var profile = profileMapper.profileCreateDtoToProfile(profileCreateDto);
        profile.setGroup(groupOptional.orElseThrow());

        var savedProfile = profileRepository.save(profile);

        playerService.createPlayer(savedProfile.getGroup().getActiveSeason(), savedProfile);

        return profileMapper.profileToProfileDto(savedProfile);
    }

    public List<ProfileDto> listAllProfilesOfGroup(String groupId) {
        return profileRepository.findAllByGroupId(groupId)
                .stream()
                .map(profileMapper::profileToProfileDto)
                .collect(Collectors.toList());
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

    public Profile getRawProfileById(String id) {
        return profileRepository.findById(id).orElse(null);
    }

    public boolean deleteProfile(String id) {
        if (profileRepository.existsById(id)) {
            profileRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public ProfileDto updateProfile(String id, ProfileCreateDto profileCreateDto) {
        var profile = getRawProfileById(id);

        if (profile == null) {
            return null;
        }

        profile.setName(profileCreateDto.getName());
        //TODO update asset

        return profileMapper.profileToProfileDto(profileRepository.save(profile));
    }
}
