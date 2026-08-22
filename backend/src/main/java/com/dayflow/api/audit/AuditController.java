package com.dayflow.api.audit;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {
  private final AuditRepository auditRepository;

  public AuditController(AuditRepository auditRepository) {
    this.auditRepository = auditRepository;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('audit:read')")
  public ApiResponse<PageResponse<AuditLogEntry>> search(
      @RequestParam(required = false) String entity,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) Long actorUserId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    int boundedSize = Math.min(Math.max(size, 1), 100);
    return ApiResponse.ok(auditRepository.search(entity, action, actorUserId, Math.max(page, 0), boundedSize));
  }
}
