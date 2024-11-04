package com.sep490.sep490.service;

import com.sep490.sep490.common.exception.ConflictException;
import com.sep490.sep490.common.exception.NameAlreadyExistsException;
import com.sep490.sep490.common.exception.RecordNotFoundException;
import com.sep490.sep490.common.utils.Constants;
import com.sep490.sep490.common.utils.ConvertUtils;
import com.sep490.sep490.common.utils.ValidateUtils;
import com.sep490.sep490.dto.BaseDTO;
import com.sep490.sep490.dto.TeamDTO;
import com.sep490.sep490.dto.UserDTO;
import com.sep490.sep490.dto.classes.request.SearchClassForGrandFinal;
import com.sep490.sep490.dto.classes.response.SearchClassResponseForGrandFinal;
import com.sep490.sep490.dto.team.ImportTeamListRequest;
import com.sep490.sep490.dto.team.ImportTeamRequest;
import com.sep490.sep490.dto.team.request.SearchTeamRequest;
import com.sep490.sep490.dto.team.response.ProgressOfTeam;
import com.sep490.sep490.dto.team.response.SearchTeamResponse;
import com.sep490.sep490.dto.user.request.CreateUserRequest;
import com.sep490.sep490.entity.*;
import com.sep490.sep490.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
@Log4j2
public class TeamService implements BaseService<Milestone, Integer>{
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MilestoneRepository milestoneRepository;
    private final WorkEvaluationRepository workEvaluationRepository;
    private final UpdateTrackingRepository updateTrackingRepository;
    private final StudentEvaluationRepository studentEvaluationRepository;
    private final RequirementRepository requirementRepository;
    private final TeamEvaluationRepository teamEvaluationRepository;
    private final CommonService commonService;
    private final SettingRepository settingRepository;
    private final ClassesRepository classesRepository;
    private final SessionRepository sessionRepository;
    private final CouncilRepository councilRepository;
    private final CouncilTeamRepository councilTeamRepository;
    @Override
    public Object create(Object requestObject) {
        log.info("create team:");
        var request = (TeamDTO) requestObject;
        request.validateInput();
        Milestone milestone = checkExistMilestone(request.getMilestoneId());
        Team findByName = teamRepository.findByTeamName(request.getTeamName(), request.getMilestoneId());
        if(findByName != null)
            throw new NameAlreadyExistsException("Team name");
        Team saveTeam = new Team();
        setBaseTeam(null, saveTeam, request, milestone);
        List<TeamMember> teamMembers = new ArrayList<>();
        for (CreateUserRequest member : request.getMembers()) {
            TeamMember teamMember = new TeamMember();
            teamMember.setTeam(saveTeam);
            teamMember.setMember(new User());
            teamMember.getMember().setId(member.getId());
            teamMembers.add(teamMember);
        }
        teamRepository.save(saveTeam);
        teamMemberRepository.saveAll(teamMembers);
        return ConvertUtils.convert(saveTeam, TeamDTO.class);
    }

    private void setBaseTeam(Integer id, Team baseTeam, TeamDTO request, Milestone milestone) {
        if(id != null)
            baseTeam.setId(id);
        baseTeam.setTeamName(request.getTeamName());
        baseTeam.setTopicName(request.getTopicName());
        baseTeam.setNote(request.getNote());
        baseTeam.setActive(false);
        baseTeam.setMilestone(milestone);
        baseTeam.setClasses(milestone.getClasses());
    }

    private Milestone checkExistMilestone(Integer milestoneId) {
        return milestoneRepository.findById(milestoneId).orElseThrow(
                () -> new RecordNotFoundException("Milestone")
        );
    }

    @Override
    public Object update(Integer id, Object requestObject) {
        log.info("update team id: " + id);
        TeamDTO request = (TeamDTO) requestObject;
        request.validateInput();
        Team saveTeam = teamRepository.findById(id).orElseThrow(
                () -> new RecordNotFoundException("Team")
        );
        Milestone milestone = checkExistMilestone(request.getMilestoneId());
        Team findByName = teamRepository.findByTeamNameAndOtherId(request.getTeamName(), id, request.getMilestoneId());
        if(findByName != null)
            throw new NameAlreadyExistsException("Team name");
        setBaseTeam(id, saveTeam, request, milestone);
        teamRepository.save(saveTeam);
        return ConvertUtils.convert(saveTeam, TeamDTO.class);
    }

    @Override
    public Object get(Integer integer) {
        return null;
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        log.info("delete team id: " + id);
        Team team = teamRepository.findById(id).orElseThrow(
                () -> new RecordNotFoundException("Team")
        );
        deleteTeamContraints(team, team.getMilestone());
        requirementRepository.deleteByTeamId(team.getId(), null);
        teamMemberRepository.deleteByTeamId(team.getId());
        teamRepository.deleteByTeamId(team.getId());
    }

    @Override
    public Object search(Object requestObject) {
        log.info("Search team: ");
        var request = (SearchTeamRequest) requestObject;
        request.validateInput();
        if(request.getMilestoneId() == null){
            SearchTeamResponse response = new SearchTeamResponse();
            response.setTeamDTOs(new ArrayList<>());
            return response;
        }
        var milestone = milestoneRepository.findById(request.getMilestoneId()).orElseThrow(
                () -> new RecordNotFoundException("Milestone")
        );
        List<Milestone> milestones = milestone.getClasses().getMilestones().stream()
                .sorted(Comparator.comparing(Milestone::getDisplayOrder))
                .toList();
        boolean isCurrentMilestone = true;
        if((milestone.getTeams() == null || milestone.getTeams().size() == 0) && milestones.size() > 1){
            int lastMilestoneId = milestones.get(0).getId(), index = -1;
            for (int i = 1; i < milestones.size(); i++) {
                if(milestone.getId().equals(milestones.get(i).getId())){
                    index = i-1;
                    break;
                }
            }
            while (index >= 0){
                if(milestones.get(index).getTeams() != null && milestones.get(index).getTeams().size() > 0){
                    lastMilestoneId = milestones.get(index).getId();
                    break;
                }
                index--;
            }
            request.setMilestoneId(lastMilestoneId);
            isCurrentMilestone = false;
        }
        List<User> students = new ArrayList<>(milestone.getClasses().getClassesUsers().stream()
                .map(ClassUser::getUser)
                .filter(user -> user.getRole().getId().equals(Constants.Role.STUDENT)).toList());
        List<Team> teams = teamRepository.search(
                request.getMilestoneId(),
                request.getTeamName(),
                request.getTopicName()
        );
        SearchTeamResponse response = new SearchTeamResponse();
        List<TeamDTO> teamDTOs = new ArrayList<>();
        List<CreateUserRequest> userDTOs = null;
        for (Team team : teams) {
            TeamDTO teamDTO = ConvertUtils.convert(team, TeamDTO.class);
            if(team.getLeader() != null)
                teamDTO.setLeaderId(team.getLeader().getId());
            userDTOs = new ArrayList<>();
            if(team.getTeamMembers() != null){
                for (TeamMember teamMember : team.getTeamMembers()) {
                    CreateUserRequest userDTO = new CreateUserRequest();
                    userDTO.setEmail(teamMember.getMember().getEmail());
                    userDTO.setFullname(teamMember.getMember().getFullname());
                    userDTO.setId(teamMember.getMember().getId());
                    userDTOs.add(userDTO);
                    removeMemberFromList(students, teamMember.getMember().getId());
                }
            }
//            teamDTO.setActive(isCurrentMilestone && team.getActive());
            teamDTO.setActive(team.getActive());
            teamDTO.setTeamOfCurrentMilestone(isCurrentMilestone);
            teamDTO.setMembers(userDTOs);
            teamDTOs.add(teamDTO);
        }
        setWishList(students, teamDTOs);
        response.setTeamDTOs(teamDTOs);
        return response;
    }

    private void setWishList(List<User> students, List<TeamDTO> teamDTOs) {
        if(students.size() > 0){
            TeamDTO wishList = new TeamDTO();
            wishList.setTeamName("Wish List");
            List<CreateUserRequest> userDTOs = new ArrayList<>();
            for (User user : students) {
                CreateUserRequest userDTO = new CreateUserRequest();
                userDTO.setEmail(user.getEmail());
                userDTO.setFullname(user.getFullname());
                userDTO.setId(user.getId());
                userDTOs.add(userDTO);
            }
            wishList.setMembers(userDTOs);
            teamDTOs.add(0, wishList);
        }
    }

    private void removeMemberFromList(List<User> students, Integer studentId) {
        int index = 0;
        for (User student : students) {
            if(student.getId().equals(studentId)){
                break;
            }
            index++;
        }
        if(index < students.size())
            students.remove(index);
    }

    public Object getTeamsProgressionByMilestone(Integer milestoneId) {
        log.info("Get teams progression by milestone: " + milestoneId);
        var milestone = milestoneRepository.findById(milestoneId).orElseThrow(
                () -> new RecordNotFoundException("Milestone")
        );
        if((milestone.getTeams() == null || milestone.getTeams().size() == 0) && milestone.getClasses().getMilestones().size() > 1){
            List<Milestone> milestones = milestone.getClasses().getMilestones();
            int lastMilestoneId = milestones.get(0).getId(), index = -1;
            for (int i = 1; i < milestones.size(); i++) {
                if(milestone.getId().equals(milestones.get(i).getId())){
                    index = i-1;
                    break;
                }
            }
            while (index >= 0){
                if(milestones.get(index).getTeams() != null && milestones.get(index).getTeams().size() > 0){
                    milestone = milestones.get(index);
                    break;
                }
                index--;
            }
        }
        List<ProgressOfTeam> progressOfTeams = new ArrayList<>();
        if(milestone.getTeams() != null){
            for (Team team : milestone.getTeams()) {
                ProgressOfTeam progressOfTeam = new ProgressOfTeam();
                progressOfTeam.setId(team.getId());
                progressOfTeam.setTeamName(team.getTeamName());
                if(milestone.getRequirements() != null){
                    List<Requirement> requirements = milestone.getRequirements().stream()
                            .filter(item -> item.getTeam() != null && item.getTeam().getId().equals(team.getId()))
                            .toList();
                    int toDo = 0, doing = 0, waiting = 0, submitted = 0, evaluated = 0;
                    for (Requirement requirement : requirements) {
                        if(requirement.getStatus().equals(Constants.RequirementStatus.REQUIREMENT_STATUSES.get(0)))
                            toDo++;
                        else if(requirement.getStatus().equals(Constants.RequirementStatus.REQUIREMENT_STATUSES.get(1)))
                            doing++;
                        else if(requirement.getStatus().equals(Constants.RequirementStatus.REQUIREMENT_STATUSES.get(2))
                            || requirement.getStatus().equals("SUBMIT LATE"))
                            submitted++;
                        else if(requirement.getStatus().equals(Constants.RequirementStatus.REQUIREMENT_STATUSES.get(3)))
                            evaluated++;
                        else if(requirement.getStatus().equals(Constants.RequirementStatus.REQUIREMENT_STATUSES.get(4)))
                            waiting++;
                    }
                    int totalReqs = requirements.size();
                    float progressToDo = Math.round((float) toDo / totalReqs * 100.0);
                    float progressDoing = Math.round((float) doing / totalReqs * 100.0);
                    float progressWaiting = Math.round((float) waiting / totalReqs * 100.0);
                    float progressSubmitted = Math.round((float) submitted / totalReqs * 100.0);
                    float progressEvaluated = Math.round((float) evaluated / totalReqs * 100.0);
                    progressOfTeam.setCompletionProgress(List.of(progressWaiting, progressToDo, progressDoing,
                            progressSubmitted, progressEvaluated));
                }
                progressOfTeams.add(progressOfTeam);
            }
        }
        return progressOfTeams;
    }

    @Transactional
    public Object importTeams(ImportTeamListRequest request) {
        log.info("import teams with milestoneId: " + request.getMilestoneId());
        request.validateInput();
        Milestone milestone = milestoneRepository.findById(request.getMilestoneId()).orElseThrow(
                () -> new RecordNotFoundException("Milestone")
        );
        List<Integer> studentIds = new ArrayList<>();
        if(milestone.getClasses().getClassesUsers() != null){
            studentIds = milestone.getClasses().getClassesUsers().stream()
                    .filter(item -> item.getUser().getRole().getId().equals(Constants.Role.STUDENT))
                    .map(item -> item.getUser().getId())
                    .toList();
        }

        deleteContraints(milestone);
        List<Team> teams = new ArrayList<>();
        for (ImportTeamRequest teamRequest : request.getTeams()) {
            Team team = new Team();
            team.setTeamName(teamRequest.getTeamName());
            team.setTopicName(teamRequest.getTopicName());
            team.setActive(false);
            team.setClasses(milestone.getClasses());
            team.setMilestone(milestone);
            setTeamLeader(team, teamRequest.getLeaderId(), studentIds);
            setTeamMembers(team, teamRequest.getMemberIds(), studentIds);
            teams.add(team);
        }
        milestone.setTeams(teams);
        milestoneRepository.save(milestone);
        SearchTeamRequest searchRequest = new SearchTeamRequest();
        searchRequest.setMilestoneId(milestone.getId());
        return search(searchRequest);
    }

    public void deleteContraints(Milestone milestone) {
        for (Team team : milestone.getTeams()) {
            // update: delete include evaluation of req and student and team.
            deleteTeamContraints(team, milestone);
            // end-----
            requirementRepository.deleteByTeamId(team.getId(), null);
            teamMemberRepository.deleteByTeamId(team.getId());
        }
        teamRepository.deleteByMilestoneId(milestone.getId());
    }

    private void deleteTeamContraints(Team team, Milestone milestone) {
        if(team.getTeamMembers() != null && team.getTeamMembers().size() > 0){
            for (TeamMember teamMember : team.getTeamMembers()) {
                studentEvaluationRepository.deleteByMilestoneIdAndMemberId(
                        milestone.getId(),
                        teamMember.getMember().getId()
                );
            }
        }
        if(team.getRequirements() != null && team.getRequirements().size() > 0){
            List<Integer> reqIds = team.getRequirements().stream()
                    .map(Requirement::getId).toList();
            updateTrackingRepository.deleteByReqIds(reqIds);
            workEvaluationRepository.deleteByReqIds(reqIds);
        }
        teamEvaluationRepository.deleteByTeamId(team.getId());
    }

    private void setTeamMembers(Team team, List<Integer> memberIds, List<Integer> studentIds) {
        team.setTeamMembers(new ArrayList<>());
        if(memberIds != null){
            for (Integer memberId : memberIds) {
                if(!studentIds.contains(memberId)){
                    throw new ConflictException("Member with id " + memberId + " is not a student in class");
                }
                TeamMember teamMember = new TeamMember();
                teamMember.setActive(true);
                teamMember.setTeam(team);
                teamMember.setMember(new User());
                teamMember.getMember().setId(memberId);
                team.getTeamMembers().add(teamMember);
            }
        }
    }

    private void setTeamLeader(Team team, Integer leaderId, List<Integer> studentIds) {
        if(leaderId != null){
            if(!studentIds.contains(leaderId)){
                throw new ConflictException("Leader with id " + leaderId + " is not a student in class!");
            }
            team.setLeader(new User());
            team.getLeader().setId(leaderId);
        }
    }

    public void updateTeamLeader(Integer teamId, Integer leaderId) {
        ValidateUtils.checkNullOrEmpty(teamId, "Team id");
        ValidateUtils.checkNullOrEmpty(leaderId, "Leader id");
        Team team = teamRepository.findById(teamId).orElseThrow(
                () -> new RecordNotFoundException("Team")
        );
        User user = commonService.getCurrentUser();
        if(team.getLeader() != null &&
                !user.getId().equals(team.getLeader().getId())
                && user.getRole().getId().equals(Constants.Role.STUDENT)){
            throw new ConflictException("Only leader can change the leader for team!");
        }
        boolean isMemberInTeam = false;
        for (TeamMember teamMember : team.getTeamMembers()) {
            if(teamMember.getMember().getId().equals(leaderId)){
                isMemberInTeam = true;
                break;
            }
        }
        if(!isMemberInTeam)
            throw new ConflictException("Leader is not member in this team!");
        team.setLeader(new User());
        team.getLeader().setId(leaderId);
        teamRepository.save(team);
    }
    @Transactional
    public Object cloneTeamsInOtherMilestone(Integer milestoneId, Integer cloneMilestoneId) {
        log.info("clone teams in milestoneId: " + cloneMilestoneId + " to milestone " + milestoneId);
        ValidateUtils.checkNullOrEmpty(milestoneId, "Milestone id");
        ValidateUtils.checkNullOrEmpty(cloneMilestoneId, "Clone milestone id");
        var milestone = milestoneRepository.findById(milestoneId).orElseThrow(
                () -> new RecordNotFoundException("Milestone")
        );
        var cloneMilestone = milestoneRepository.findById(cloneMilestoneId).orElseThrow(
                () -> new RecordNotFoundException("Clone milestone")
        );
        checkConditionToClone(milestone, cloneMilestone);
        deleteContraints(milestone);
        List<Team> teams = new ArrayList<>();
        for (Team team : cloneMilestone.getTeams()) {
            Team newTeam = cloneTeam(team, milestone);
            teams.add(newTeam);
        }
        milestone.setTeams(teams);
        milestoneRepository.save(milestone);

        SearchTeamRequest searchRequest = new SearchTeamRequest();
        searchRequest.setMilestoneId(milestone.getId());
        return search(searchRequest);
    }

    private Team cloneTeam(Team team, Milestone milestone) {
        Team newTeam = new Team();
        newTeam.setTeamName(team.getTeamName());
        newTeam.setTopicName(team.getTopicName());
        newTeam.setNote(team.getNote());
        newTeam.setActive(false);
        newTeam.setMilestone(milestone);
        newTeam.setClasses(milestone.getClasses());
        if(team.getLeader() != null){
            newTeam.setLeader(new User());
            newTeam.getLeader().setId(team.getLeader().getId());
        }
        if(team.getClasses() != null){
            newTeam.setClasses(new Classes());
            newTeam.getClasses().setId(team.getClasses().getId());
        }
        List<TeamMember> teamMembers = new ArrayList<>();
        for (TeamMember teamMember : team.getTeamMembers()) {
            TeamMember member = new TeamMember();
            member.setTeam(newTeam);
            member.setMember(teamMember.getMember());
            member.setActive(teamMember.getActive());
            teamMembers.add(member);
        }
        newTeam.setTeamMembers(teamMembers);
        return newTeam;
    }

    private void checkConditionToClone(Milestone milestone, Milestone cloneMilestone) {
        if(!milestone.getClasses().getId().equals(cloneMilestone.getClasses().getId())) {
            throw new ConflictException("The clone milestone is not in the same milestone's class!");
        }
        if(cloneMilestone.getTeams() == null || cloneMilestone.getTeams().size() == 0){
            throw new ConflictException("The clone milestone have no team to clone!");
        }
    }
    @Transactional
    public void closeUpdate(Integer milestoneId) {
        Milestone milestone = checkExistMilestone(milestoneId);
        int numberOfMembers = milestone.getTeams().stream()
                .flatMap(item -> item.getTeamMembers().stream())
                .toList().size();
        int numberOfStudents = milestone.getClasses().getClassesUsers().stream()
                .filter(item -> item.getUser().getRole().getId().equals(Constants.Role.STUDENT))
                .toList().size();
        if(numberOfMembers < numberOfStudents){
            throw new ConflictException("Please divide students in Wish List to other team!");
        }
        if(milestone.getTeams() != null && milestone.getTeams().size() > 0){
            List<Team> teams = new ArrayList<>();
            for (Team team : milestone.getTeams()) {
                team.setActive(true);
                teams.add(team);
            }
            teamRepository.saveAll(teams);
        }
    }
    @Transactional
    public Object resetTeams(Integer milestoneId) {
        Milestone milestone = checkExistMilestone(milestoneId);
        if(milestone.getTeams() != null && milestone.getTeams().size() > 0){
            for (Team team : milestone.getTeams()) {
                deleteTeamContraints(team, team.getMilestone());
                requirementRepository.deleteByTeamId(team.getId(), null);
                teamMemberRepository.deleteByTeamId(team.getId());
                teamRepository.deleteByTeamId(team.getId());
            }
        }
//        SearchTeamRequest searchRequest = new SearchTeamRequest();
//        searchRequest.setMilestoneId(milestoneId);
//        return search(searchRequest);
        return "Reset teams successfully!";
    }

    public Object searchForGrandFinal(SearchClassForGrandFinal request) {
        SearchClassResponseForGrandFinal response = new SearchClassResponseForGrandFinal();
        response.setClassList(new ArrayList<>());
        List<BaseDTO> teams = new ArrayList<>();
        if(request.getClassId() == null){
            return response;
        }
        User currentUser = commonService.getCurrentUser();
        Classes classes = classesRepository.findById(request.getClassId()).orElseThrow(() -> new RecordNotFoundException("Class"));
        List<Session> sessions = new ArrayList<>();
        if(request.getSemesterId() != null && request.getRoundId() != null){
            Setting semester = (Setting) settingRepository.findSettingBySettingTypeAndSettingId( "semester", request.getSemesterId());
            if(semester == null){
                throw new RecordNotFoundException("Semester");
            }
            Setting round = (Setting) settingRepository.findSettingBySettingTypeAndSettingId( "round", request.getRoundId());
            if(round == null){
                throw new RecordNotFoundException("Round");
            }
            sessions = sessionRepository.findBySemesterIdAndRoundId(semester.getId(), round.getId());
        }
        if(request.getSessionId() != null){
            Session session = sessionRepository.findById(request.getSessionId()).orElseThrow(() -> new RecordNotFoundException("Session"));
            sessions.add(session);
        }
//        List<Council> councils = councilRepository.findBySemesterIdAndRoundId(round.getId(), semester.getId());
        List<CouncilTeam> councilTeamList = councilTeamRepository.findBySessionAndCouncilsAndClasses(
            sessions.stream().map(Session::getId).toList(),
            classes.getId(),
            currentUser.getId(),
            currentUser.getRole().getId().equals(Constants.Role.TEACHER),
            currentUser.getRole().getId().equals(Constants.Role.STUDENT)
        );

        for (CouncilTeam councilTeam : councilTeamList) {
            if(councilTeam.getTeamId() != null){
                teamRepository.findById(councilTeam.getTeamId()).ifPresent(team
                        -> teams.add(new BaseDTO(team.getId(), team.getTeamName())));
            }
        }
        response.setClassList(teams);
        response.setCanEvaluate(currentUser.getRole().getId().equals(Constants.Role.TEACHER));
        return response;
    }
}