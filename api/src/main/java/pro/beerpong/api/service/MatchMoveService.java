package pro.beerpong.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.mapping.MatchMoveMapper;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDto;
import pro.beerpong.api.model.dto.matchmoves.MatchMoveDtoComplete;
import pro.beerpong.api.model.dto.teammembers.TeamMemberDto;
import pro.beerpong.api.repository.MatchMoveRepository;
import pro.beerpong.api.repository.RuleMoveRepository;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MatchMoveService {
    private final MatchMoveRepository matchMoveRepository;
    private final RuleMoveRepository ruleMoveRepository;

    private final MatchMoveMapper matchMoveMapper;

    public void createMatchMoves(TeamMember teamMember, List<MatchMoveDto> moves) {
        List<MatchMove> entities = moves.stream()
                .filter(dto -> dto.getCount() >= 1)
                .map(dto -> new MatchMove(
                        null,
                        dto.getCount(),
                        teamMember,
                        ruleMoveRepository.getReferenceById(dto.getMoveId())
                ))
                .toList();

        matchMoveRepository.saveAll(entities);
    }

    public List<MatchMoveDtoComplete> buildMatchMoveDtos(List<TeamMemberDto> teamMembers) {
        List<String> memberIds = teamMembers.stream()
                .map(TeamMemberDto::getId)
                .toList();

        return matchMoveRepository.findByTeamMemberIdIn(memberIds)
                .stream()
                .map(matchMoveMapper::matchMoveToMatchMoveDtoComplete)
                .toList();
    }
}
