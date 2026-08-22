package com.dayflow.api.shift;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {
  private final ShiftRepository shiftRepository;
  private final AuditService auditService;

  public ShiftController(ShiftRepository shiftRepository, AuditService auditService) {
    this.shiftRepository = shiftRepository;
    this.auditService = auditService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('shift:read')")
  public ApiResponse<List<Shift>> list() {
    return ApiResponse.ok(shiftRepository.findAll());
  }

  @PostMapping
  @PreAuthorize("hasAuthority('shift:write')")
  public ResponseEntity<ApiResponse<Shift>> create(@AuthenticationPrincipal CurrentUser user, @jakarta.validation.Valid @RequestBody CreateShiftRequest request) {
    Shift created = shiftRepository.create(request.name(), request.startTime(), request.endTime(), request.graceMinutes(), request.breakMinutes());
    auditService.record(user.userId(), "CREATE_SHIFT", "Shift", String.valueOf(created.id()), null, created, null);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
  }

  @PutMapping("/{employeeId}/assign")
  @PreAuthorize("hasAuthority('shift:write')")
  public ApiResponse<Void> assign(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId, @RequestBody AssignShiftRequest request) {
    shiftRepository.assignToEmployee(employeeId, request.shiftId());
    auditService.record(user.userId(), "ASSIGN_SHIFT", "Employee", String.valueOf(employeeId), null,
        java.util.Map.of("shiftId", String.valueOf(request.shiftId())), null);
    return ApiResponse.ok(null);
  }

  public record CreateShiftRequest(@NotBlank String name, @NotNull LocalTime startTime, @NotNull LocalTime endTime,
      int graceMinutes, int breakMinutes) {
  }

  public record AssignShiftRequest(Long shiftId) {
  }
}
