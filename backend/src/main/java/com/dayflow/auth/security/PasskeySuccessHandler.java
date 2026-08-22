package com.dayflow.auth.security;

import com.dayflow.auth.config.DayflowProperties;
import com.dayflow.auth.repo.AuthRepository;
import com.dayflow.auth.service.AuthService;
import jakarta.servlet.http.*;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class PasskeySuccessHandler implements AuthenticationSuccessHandler {
  private final AuthRepository users; private final AuthService auth; private final DayflowProperties props; private final ObjectMapper json;
  public PasskeySuccessHandler(AuthRepository users,AuthService auth,DayflowProperties props,ObjectMapper json){this.users=users;this.auth=auth;this.props=props;this.json=json;}
  @Override public void onAuthenticationSuccess(HttpServletRequest request,HttpServletResponse response,Authentication authentication) throws java.io.IOException {
    var user=users.findUser(authentication.getName()).orElseThrow();
    var issued=auth.issue(user,"Passkey on "+safe(request.getHeader("User-Agent")),request.getRemoteAddr(),request.getHeader("User-Agent"));
    response.addHeader("Set-Cookie",cookie("dayflow_refresh",issued.refreshToken(),true).toString());
    response.addHeader("Set-Cookie",cookie("dayflow_session",issued.sessionId().toString(),false).toString());
    response.setContentType("application/json"); json.writeValue(response.getOutputStream(),issued.response());
  }
  private ResponseCookie cookie(String name,String value,boolean httpOnly){return ResponseCookie.from(name,value).httpOnly(httpOnly).secure(props.cookieSecure()).sameSite("Strict").path("/api/auth").maxAge(Duration.ofDays(props.refreshTokenDays())).build();}
  private String safe(String value){return value==null?"browser":value.substring(0,Math.min(value.length(),80));}
}
