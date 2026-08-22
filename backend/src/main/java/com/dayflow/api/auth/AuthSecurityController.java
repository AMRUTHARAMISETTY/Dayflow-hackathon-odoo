package com.dayflow.api.auth;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthSecurityController {
  private final AuthSecurityService service;

  AuthSecurityController(AuthSecurityService service) {
    this.service = service;
  }

  @PostMapping("/employee/activate")
  ApiResponse<SecurityMessageResponse> activate(@Valid @RequestBody EmployeeActivationRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.activateEmployee(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/email/send-otp")
  ApiResponse<SecurityMessageResponse> sendOtp(@Valid @RequestBody OtpRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.sendOtp(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/email/verify-otp")
  ApiResponse<SecurityMessageResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.verifyOtp(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/password/forgot")
  ApiResponse<SecurityMessageResponse> forgotPassword(@Valid @RequestBody GenericIdentifierRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.forgotPassword(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/password/reset")
  ApiResponse<SecurityMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.resetPassword(request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/passkeys/register/options")
  ApiResponse<PasskeyOptionsResponse> registerOptions(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(service.registerOptions(user));
  }

  @PostMapping("/passkeys/register/verify")
  ApiResponse<PasskeyViewResponse> registerVerify(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody PasskeyRegisterVerifyRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.verifyRegister(user, request, servletRequest.getRemoteAddr()));
  }

  @PostMapping("/passkeys/login/options")
  ApiResponse<PasskeyOptionsResponse> loginOptions(@RequestBody PasskeyLoginOptionsRequest request) {
    return ApiResponse.ok(service.loginOptions(request));
  }

  @PostMapping("/passkeys/login/verify")
  ApiResponse<TokenPairResponse> loginVerify(@Valid @RequestBody PasskeyLoginVerifyRequest request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.verifyLogin(request, servletRequest.getRemoteAddr()));
  }

  @GetMapping("/sessions")
  ApiResponse<List<SessionViewResponse>> sessions(@AuthenticationPrincipal CurrentUser user,
      @RequestHeader(value = "X-Refresh-Token", required = false) String refreshToken) {
    return ApiResponse.ok(service.sessions(user, refreshToken));
  }

  @DeleteMapping("/sessions/{sessionId}")
  ApiResponse<Void> revokeSession(@AuthenticationPrincipal CurrentUser user, @PathVariable long sessionId) {
    service.revokeSession(user, sessionId);
    return ApiResponse.ok(null);
  }

  @GetMapping("/passkeys")
  ApiResponse<List<PasskeyViewResponse>> passkeys(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(service.passkeys(user));
  }

  @DeleteMapping("/passkeys/{credentialId}")
  ApiResponse<Void> deletePasskey(@AuthenticationPrincipal CurrentUser user, @PathVariable String credentialId,
      HttpServletRequest servletRequest) {
    service.deletePasskey(user, credentialId, servletRequest.getRemoteAddr());
    return ApiResponse.ok(null);
  }

  @GetMapping("/security-events")
  ApiResponse<List<SecurityEventResponse>> securityEvents(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(service.securityEvents(user));
  }
}
