package com.dayflow.api.project;

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
@RequestMapping("/api/projects")
public class ProjectController {
  private final ProjectService projectService;

  public ProjectController(ProjectService projectService) {
    this.projectService = projectService;
  }

  @GetMapping
  public ApiResponse<PageResponse<Project>> search(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Long ownerEmployeeId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(projectService.search(user, q, status, ownerEmployeeId, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @GetMapping("/{id}")
  public ApiResponse<Project> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(projectService.get(user, id));
  }

  @GetMapping("/{id}/milestones")
  public ApiResponse<List<ProjectMilestone>> milestones(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(projectService.milestones(user, id));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Project>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateProjectRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(projectService.create(user, request)));
  }

  @PostMapping("/{id}/milestones")
  public ApiResponse<List<ProjectMilestone>> addMilestone(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody CreateMilestoneRequest request) {
    return ApiResponse.ok(projectService.addMilestone(user, id, request));
  }
}
