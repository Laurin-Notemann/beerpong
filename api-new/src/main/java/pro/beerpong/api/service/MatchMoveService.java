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
        for (MatchMoveDto moveDto : moves) {
            if (moveDto.getCount() < 1) {
                continue;
            }

            MatchMove matchMove = new MatchMove();

            matchMove.setTeamMember(teamMember);
            matchMove.setRuleMove(ruleMoveRepository.getReferenceById(moveDto.getMoveId()));
            matchMove.setValue(moveDto.getCount());

            matchMoveRepository.save(matchMove);
        }
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
