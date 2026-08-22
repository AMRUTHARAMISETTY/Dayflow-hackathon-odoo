package com.dayflow.api.task;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.project.ProjectRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.team.TeamRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {
  private final TaskRepository taskRepository;
  private final ProjectRepository projectRepository;
  private final TeamRepository teamRepository;
  private final EmployeeRepository employeeRepository;
  private final AuditService auditService;

  public TaskService(TaskRepository taskRepository, ProjectRepository projectRepository,
      TeamRepository teamRepository, EmployeeRepository employeeRepository, AuditService auditService) {
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
    this.teamRepository = teamRepository;
    this.employeeRepository = employeeRepository;
    this.auditService = auditService;
  }

  public PageResponse<TaskItem> search(CurrentUser actor, Long projectId, Long teamId, Long assigneeEmployeeId,
      String status, int page, int size) {
    actor.require("task:read");
    return taskRepository.search(projectId, teamId, assigneeEmployeeId, status, page, size);
  }

  public TaskItem get(CurrentUser actor, long id) {
    actor.require("task:read");
    return taskRepository.requireById(id);
  }

  public List<TaskAssignee> assignees(CurrentUser actor, long taskId) {
    get(actor, taskId);
    return taskRepository.assignees(taskId);
  }

  @Transactional
  public TaskItem create(CurrentUser actor, CreateTaskRequest request) {
    actor.require("task:write");
    projectRepository.requireById(request.projectId());
    if (request.teamId() != null) teamRepository.requireById(request.teamId());
    if (request.reporterEmployeeId() != null) employeeRepository.requireById(request.reporterEmployeeId());
    if (request.reviewerEmployeeId() != null) employeeRepository.requireById(request.reviewerEmployeeId());
    if (request.assigneeEmployeeIds() != null) {
      for (Long employeeId : request.assigneeEmployeeIds()) employeeRepository.requireById(employeeId);
    }
    long id = taskRepository.create(request, actor.employeeId());
    if (request.assigneeEmployeeIds() != null) {
      for (Long employeeId : request.assigneeEmployeeIds()) taskRepository.assign(id, employeeId, "Owner", null);
    }
    TaskItem created = taskRepository.requireById(id);
    auditService.record(actor.userId(), "CREATE_TASK", "Task", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public TaskItem updateStatus(CurrentUser actor, long taskId, UpdateTaskStatusRequest request) {
    actor.require("task:write");
    TaskItem before = taskRepository.requireById(taskId);
    taskRepository.updateStatus(taskId, request.status(), request.actualHours());
    TaskItem after = taskRepository.requireById(taskId);
    auditService.record(actor.userId(), "UPDATE_TASK_STATUS", "Task", String.valueOf(taskId), before, after, null);
    return after;
  }

  @Transactional
  public List<TaskAssignee> assign(CurrentUser actor, long taskId, AssignTaskRequest request) {
    actor.require("task:write");
    TaskItem before = taskRepository.requireById(taskId);
    employeeRepository.requireById(request.employeeId());
    taskRepository.assign(taskId, request.employeeId(), request.role(), request.allocationPercent());
    List<TaskAssignee> after = taskRepository.assignees(taskId);
    auditService.record(actor.userId(), "ASSIGN_TASK", "Task", String.valueOf(taskId), before, after, null);
    return after;
  }
}
