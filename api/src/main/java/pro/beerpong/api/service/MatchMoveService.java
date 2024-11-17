package pro.beerpong.api.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pro.beerpong.api.model.dao.MatchMove;
import pro.beerpong.api.model.dao.RuleMove;
import pro.beerpong.api.model.dao.TeamMember;
import pro.beerpong.api.model.dto.MatchMoveDto;
import pro.beerpong.api.repository.MatchMoveRepository;
import pro.beerpong.api.repository.RuleMoveRepository;
import pro.beerpong.api.repository.TeamMemberRepository;

import java.util.List;

@Service
public class MatchMoveService {

    private final MatchMoveRepository matchMoveRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RuleMoveRepository ruleMoveRepository;

    @Autowired
    public MatchMoveService(MatchMoveRepository matchMoveRepository,
                            TeamMemberRepository teamMemberRepository,
                            RuleMoveRepository ruleMoveRepository) {
        this.matchMoveRepository = matchMoveRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.ruleMoveRepository = ruleMoveRepository;
    }

    public void createMatchMoves(TeamMember teamMember, List<MatchMoveDto> moves) {
        for (MatchMoveDto moveDto : moves) {
            RuleMove ruleMove = ruleMoveRepository.findById(moveDto.getMoveId())
                    .orElseThrow(() -> new IllegalArgumentException("RuleMove not found: " + moveDto.getMoveId()));
            if (ruleMove.getSeason().getId() != teamMember.getTeam().getMatch().getSeason().getId()) {
                throw new IllegalArgumentException("RuleMove not found: " + moveDto.getMoveId());
            }
            MatchMove matchMove = new MatchMove();
            matchMove.setTeamMember(teamMember);
            matchMove.setMove(ruleMove);
            matchMove.setValue(moveDto.getCount());

            matchMoveRepository.save(matchMove);
        }
    }
}
