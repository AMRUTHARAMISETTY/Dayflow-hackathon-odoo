package com.dayflow.api.notification;

import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.security.JwtService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService notificationService;
  private final JwtService jwtService;

  public NotificationController(NotificationService notificationService, JwtService jwtService) {
    this.notificationService = notificationService;
    this.jwtService = jwtService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('notification:read')")
  public ApiResponse<List<Notification>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(defaultValue = "false") boolean unreadOnly, @RequestParam(defaultValue = "30") int limit) {
    return ApiResponse.ok(notificationService.list(user.userId(), unreadOnly, Math.min(Math.max(limit, 1), 100)));
  }

  @GetMapping("/unread-count")
  @PreAuthorize("hasAuthority('notification:read')")
  public ApiResponse<Map<String, Integer>> unreadCount(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(Map.of("count", notificationService.unreadCount(user.userId())));
  }

  @PostMapping("/{id}/read")
  @PreAuthorize("hasAuthority('notification:read')")
  public ApiResponse<Void> markRead(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    notificationService.markRead(user.userId(), id);
    return ApiResponse.ok(null);
  }

  @PostMapping("/read-all")
  @PreAuthorize("hasAuthority('notification:read')")
  public ApiResponse<Void> markAllRead(@AuthenticationPrincipal CurrentUser user) {
    notificationService.markAllRead(user.userId());
    return ApiResponse.ok(null);
  }

  /**
   * EventSource cannot send an Authorization header, so this endpoint is left open at the
   * security-filter level (see SecurityConfig) and authenticates the `token` query param itself.
   */
  @GetMapping("/stream")
  public SseEmitter stream(@RequestParam String token) {
    CurrentUser user;
    try {
      user = jwtService.parse(token);
    } catch (JwtService.BadAccessTokenException ex) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired session.");
    }
    return notificationService.subscribe(user.userId());
  }
}
