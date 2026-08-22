package com.dayflow.api.workload;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workload")
public class WorkloadController {
  private final WorkloadService workloadService;

  public WorkloadController(WorkloadService workloadService) {
    this.workloadService = workloadService;
  }

  @GetMapping
  public ApiResponse<List<WorkloadRow>> workload(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) Long teamId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return ApiResponse.ok(workloadService.workload(user, teamId, from, to));
  }
}
