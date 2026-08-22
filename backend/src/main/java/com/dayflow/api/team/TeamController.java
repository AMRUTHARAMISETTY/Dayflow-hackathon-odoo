package com.dayflow.api.team;

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
@RequestMapping("/api/teams")
public class TeamController {
  private final TeamService teamService;

  public TeamController(TeamService teamService) {
    this.teamService = teamService;
  }

  @GetMapping
  public ApiResponse<PageResponse<Team>> search(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String type,
      @RequestParam(required = false) Long departmentId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(teamService.search(user, q, type, departmentId, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @GetMapping("/{id}")
  public ApiResponse<Team> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(teamService.get(user, id));
  }

  @GetMapping("/{id}/members")
  public ApiResponse<List<TeamMember>> members(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(teamService.members(user, id));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Team>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateTeamRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(teamService.create(user, request)));
  }

  @PostMapping("/{id}/members")
  public ApiResponse<List<TeamMember>> addMembers(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody AddTeamMembersRequest request) {
    return ApiResponse.ok(teamService.addMembers(user, id, request));
  }
}
