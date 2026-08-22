package com.dayflow.api.task;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
  private final TaskService taskService;

  public TaskController(TaskService taskService) {
    this.taskService = taskService;
  }

  @GetMapping
  public ApiResponse<PageResponse<TaskItem>> search(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) Long projectId,
      @RequestParam(required = false) Long teamId,
      @RequestParam(required = false) Long assigneeEmployeeId,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(taskService.search(user, projectId, teamId, assigneeEmployeeId, status,
        Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @GetMapping("/{id}")
  public ApiResponse<TaskItem> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(taskService.get(user, id));
  }

  @GetMapping("/{id}/assignees")
  public ApiResponse<List<TaskAssignee>> assignees(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(taskService.assignees(user, id));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<TaskItem>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateTaskRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(taskService.create(user, request)));
  }

  @PostMapping("/{id}/status")
  public ApiResponse<TaskItem> updateStatus(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody UpdateTaskStatusRequest request) {
    return ApiResponse.ok(taskService.updateStatus(user, id, request));
  }

  @PostMapping("/{id}/assignees")
  public ApiResponse<List<TaskAssignee>> assign(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody AssignTaskRequest request) {
    return ApiResponse.ok(taskService.assign(user, id, request));
  }
}
