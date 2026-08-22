package com.dayflow.api.project;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.team.TeamRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {
  private final ProjectRepository projectRepository;
  private final EmployeeRepository employeeRepository;
  private final TeamRepository teamRepository;
  private final AuditService auditService;

  public ProjectService(ProjectRepository projectRepository, EmployeeRepository employeeRepository,
      TeamRepository teamRepository, AuditService auditService) {
    this.projectRepository = projectRepository;
    this.employeeRepository = employeeRepository;
    this.teamRepository = teamRepository;
    this.auditService = auditService;
  }

  public PageResponse<Project> search(CurrentUser actor, String q, String status, Long ownerEmployeeId, int page, int size) {
    actor.require("project:read");
    return projectRepository.search(q, status, ownerEmployeeId, page, size);
  }

  public Project get(CurrentUser actor, long id) {
    actor.require("project:read");
    return projectRepository.requireById(id);
  }

  public List<ProjectMilestone> milestones(CurrentUser actor, long projectId) {
    get(actor, projectId);
    return projectRepository.milestones(projectId);
  }

  @Transactional
  public Project create(CurrentUser actor, CreateProjectRequest request) {
    actor.require("project:write");
    if (projectRepository.existsByCode(request.code())) {
      throw ApiException.conflict("A project with this code already exists.");
    }
    employeeRepository.requireById(request.sponsorEmployeeId());
    employeeRepository.requireById(request.ownerEmployeeId());
    if (request.teamIds() != null) {
      for (Long teamId : request.teamIds()) {
        teamRepository.requireById(teamId);
      }
    }
    long id = projectRepository.create(request);
    if (request.teamIds() != null) {
      for (Long teamId : request.teamIds()) {
        projectRepository.addTeam(id, teamId);
      }
    }
    Project project = projectRepository.requireById(id);
    auditService.record(actor.userId(), "CREATE_PROJECT", "Project", String.valueOf(id), null, project, null);
    return project;
  }

  @Transactional
  public List<ProjectMilestone> addMilestone(CurrentUser actor, long projectId, CreateMilestoneRequest request) {
    actor.require("project:write");
    Project before = projectRepository.requireById(projectId);
    projectRepository.addMilestone(projectId, request);
    List<ProjectMilestone> after = projectRepository.milestones(projectId);
    auditService.record(actor.userId(), "ADD_PROJECT_MILESTONE", "Project", String.valueOf(projectId), before, after, null);
    return after;
  }
}
