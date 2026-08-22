package com.dayflow.api.team;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.department.DepartmentRepository;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.security.CurrentUser;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeamService {
  private final TeamRepository teamRepository;
  private final EmployeeRepository employeeRepository;
  private final DepartmentRepository departmentRepository;
  private final AuditService auditService;

  public TeamService(TeamRepository teamRepository, EmployeeRepository employeeRepository,
      DepartmentRepository departmentRepository, AuditService auditService) {
    this.teamRepository = teamRepository;
    this.employeeRepository = employeeRepository;
    this.departmentRepository = departmentRepository;
    this.auditService = auditService;
  }

  public PageResponse<Team> search(CurrentUser actor, String q, String type, Long departmentId, int page, int size) {
    actor.require("team:read");
    return teamRepository.search(q, type, departmentId, page, size);
  }

  public Team get(CurrentUser actor, long id) {
    actor.require("team:read");
    Team team = teamRepository.requireById(id);
    assertCanView(actor, team);
    return team;
  }

  public List<TeamMember> members(CurrentUser actor, long id) {
    Team team = get(actor, id);
    assertCanView(actor, team);
    return teamRepository.members(id);
  }

  @Transactional
  public Team create(CurrentUser actor, CreateTeamRequest request) {
    actor.require("team:write");
    validateReferences(request);
    if (teamRepository.existsByCode(request.code())) {
      throw ApiException.conflict("A team with this code already exists.");
    }
    long id = teamRepository.create(request);
    Team created = teamRepository.requireById(id);
    auditService.record(actor.userId(), "CREATE_TEAM", "Team", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public List<TeamMember> addMembers(CurrentUser actor, long teamId, AddTeamMembersRequest request) {
    actor.require("team:write");
    Team before = teamRepository.requireById(teamId);
    for (MemberSelection member : request.members()) {
      employeeRepository.requireById(member.employeeId());
      if (member.temporaryCoverEmployeeId() != null) employeeRepository.requireById(member.temporaryCoverEmployeeId());
      teamRepository.addMember(teamId, member);
    }
    List<TeamMember> after = teamRepository.members(teamId);
    auditService.record(actor.userId(), "ADD_TEAM_MEMBERS", "Team", String.valueOf(teamId), before, after,
        "Members added through team workspace");
    return after;
  }

  private void validateReferences(CreateTeamRequest request) {
    if (request.departmentId() != null && departmentRepository.findById(request.departmentId()).isEmpty()) {
      throw ApiException.badRequest("Unknown department.");
    }
    if (request.ownerEmployeeId() != null) employeeRepository.requireById(request.ownerEmployeeId());
    if (request.leadEmployeeId() != null) employeeRepository.requireById(request.leadEmployeeId());
    if (request.deputyLeadEmployeeId() != null) employeeRepository.requireById(request.deputyLeadEmployeeId());
  }

  private void assertCanView(CurrentUser actor, Team team) {
    if (actor.has("employee:read") || actor.role().equals("AUDITOR")) return;
    if (teamRepository.isMemberOrLead(team.id(), actor.employeeId())) return;
    throw ApiException.forbidden("You do not have permission to view this team.");
  }
}
