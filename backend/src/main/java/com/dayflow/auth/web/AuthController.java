package com.dayflow.auth.web;

import com.dayflow.auth.config.DayflowProperties;
import com.dayflow.auth.model.AuthModels.*;
import com.dayflow.auth.service.AuthService;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth; private final DayflowProperties props;
  public AuthController(AuthService auth,DayflowProperties props){this.auth=auth;this.props=props;}
  @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken(),"headerName",token.getHeaderName());}
  @PostMapping("/login") public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest body,HttpServletRequest req){return response(auth.login(body,ip(req),req.getHeader("User-Agent")));}
  @PostMapping("/refresh") public ResponseEntity<LoginResponse> refresh(@CookieValue(name="dayflow_refresh",required=false)String token,HttpServletRequest req){return response(auth.refresh(token,ip(req),req.getHeader("User-Agent")));}
  @PostMapping("/logout") public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt,@CookieValue(name="dayflow_session",required=false)UUID sid){if(sid!=null)auth.revoke(UUID.fromString(jwt.getSubject()),sid);return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE,expired("dayflow_refresh").toString()).header(HttpHeaders.SET_COOKIE,expired("dayflow_session").toString()).build();}
  @GetMapping("/me") public Principal me(@AuthenticationPrincipal Jwt jwt){return auth.me(UUID.fromString(jwt.getSubject()));}
  @PostMapping("/email/send-otp") public ResponseEntity<Void> otp(@RequestBody OtpRequest r){auth.sendOtp(r.identifier(),r.purpose());return ResponseEntity.accepted().build();}
  @PostMapping("/email/verify-otp") public ResponseEntity<?> verify(@RequestBody OtpVerify r,HttpServletRequest req){var issued=auth.verifyOtp(r,ip(req),req.getHeader("User-Agent"));return issued.<ResponseEntity<?>>map(this::response).orElseGet(()->ResponseEntity.noContent().build());}
  @PostMapping("/password/forgot") public ResponseEntity<Map<String,String>> forgot(@RequestBody PasswordResetRequest r){auth.forgot(r.identifier());return ResponseEntity.accepted().body(Map.of("message","If the account can be verified, recovery instructions will be sent."));}
  @PostMapping("/password/reset") public ResponseEntity<Void> reset(@RequestBody PasswordReset r){auth.reset(r);return ResponseEntity.noContent().build();}
  @GetMapping("/sessions") public List<Map<String,Object>> sessions(@AuthenticationPrincipal Jwt jwt){return auth.sessions(UUID.fromString(jwt.getSubject()));}
  @DeleteMapping("/sessions/{id}") public ResponseEntity<Void> revoke(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){auth.revoke(UUID.fromString(jwt.getSubject()),id);return ResponseEntity.noContent().build();}
  @GetMapping("/security-events") public List<Map<String,Object>> events(@AuthenticationPrincipal Jwt jwt){return auth.events(UUID.fromString(jwt.getSubject()));}
  @PostMapping("/employee/activate") public ResponseEntity<Map<String,String>> activate(@RequestBody ActivationStart r){auth.startActivation(r);return ResponseEntity.accepted().body(Map.of("message","If the employee record can be verified, activation instructions will be sent."));}
  @PostMapping("/employee/activate/complete") public ResponseEntity<Void> completeActivation(@RequestBody ActivationComplete r){auth.completeActivation(r);return ResponseEntity.noContent().build();}
  private ResponseEntity<LoginResponse> response(AuthService.Issued issued){if(issued.refreshToken()==null)return ResponseEntity.ok(issued.response());return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE,cookie("dayflow_refresh",issued.refreshToken(),Duration.ofDays(props.refreshTokenDays()),true).toString()).header(HttpHeaders.SET_COOKIE,cookie("dayflow_session",issued.sessionId().toString(),Duration.ofDays(props.refreshTokenDays()),false).toString()).body(issued.response());}
  private ResponseCookie cookie(String name,String value,Duration age,boolean httpOnly){return ResponseCookie.from(name,value).httpOnly(httpOnly).secure(props.cookieSecure()).sameSite("Strict").path("/api/auth").maxAge(age).build();}
  private ResponseCookie expired(String name){return ResponseCookie.from(name,"").httpOnly(true).secure(props.cookieSecure()).sameSite("Strict").path("/api/auth").maxAge(0).build();}
  private String ip(HttpServletRequest r){String forwarded=r.getHeader("X-Forwarded-For");String raw=forwarded==null?r.getRemoteAddr():forwarded.split(",")[0].trim();return raw.replaceAll("(?<=\\d)\\.\\d+$",".0");}
}
