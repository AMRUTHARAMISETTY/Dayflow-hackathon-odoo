package com.dayflow.api.attendance;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.time.LocalDate;
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
@RequestMapping("/api/attendance")
public class AttendanceController {
  private final AttendanceService attendanceService;

  public AttendanceController(AttendanceService attendanceService) {
    this.attendanceService = attendanceService;
  }

  @PostMapping("/check-in")
  public ApiResponse<AttendanceDayView> checkIn(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(attendanceService.checkIn(user));
  }

  @PostMapping("/check-out")
  public ApiResponse<AttendanceDayView> checkOut(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(attendanceService.checkOut(user));
  }

  @GetMapping("/today")
  public ApiResponse<List<AttendanceDayView>> today(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) Long departmentId) {
    return ApiResponse.ok(attendanceService.today(user, departmentId));
  }

  @GetMapping("/employees/{id}")
  public ApiResponse<List<AttendanceDayView>> forEmployee(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @RequestParam LocalDate from, @RequestParam LocalDate to) {
    return ApiResponse.ok(attendanceService.forEmployee(user, id, from, to));
  }

  @GetMapping("/employees/{id}/summary")
  public ApiResponse<AttendanceSummary> summary(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @RequestParam LocalDate from, @RequestParam LocalDate to) {
    return ApiResponse.ok(attendanceService.summaryForEmployee(user, id, from, to));
  }

  @PostMapping("/corrections")
  public ResponseEntity<ApiResponse<AttendanceCorrection>> requestCorrection(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CorrectionRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(attendanceService.requestCorrection(user, request)));
  }

  @GetMapping("/corrections")
  public ApiResponse<PageResponse<AttendanceCorrection>> listCorrections(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status, @RequestParam(required = false) Long employeeId,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(attendanceService.listCorrections(user, status, employeeId, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @PostMapping("/corrections/{id}/decide")
  public ApiResponse<AttendanceCorrection> decideCorrection(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody CorrectionDecisionRequest request) {
    return ApiResponse.ok(attendanceService.decideCorrection(user, id, request));
  }
}
