package com.dayflow.api.auth;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public ResponseEntity<ApiResponse<TokenPairResponse>> register(@Valid @RequestBody RegisterRequest request,
      HttpServletRequest servletRequest) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.ok(authService.register(request, servletRequest.getRemoteAddr())));
  }

  @PostMapping("/login")
  public ApiResponse<TokenPairResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(authService.login(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/refresh")
  public ApiResponse<TokenPairResponse> refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(authService.refresh(request.refreshToken(), servletRequest.getRemoteAddr()));
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(@Valid @RequestBody RefreshRequest request) {
    authService.logout(request.refreshToken());
    return ApiResponse.ok(null);
  }

  @GetMapping("/me")
  public ApiResponse<UserView> me(@AuthenticationPrincipal CurrentUser currentUser) {
    return ApiResponse.ok(authService.me(currentUser));
  }
}
