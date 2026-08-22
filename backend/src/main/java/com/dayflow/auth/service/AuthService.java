package com.dayflow.auth.service;

import com.dayflow.auth.config.DayflowProperties;
import com.dayflow.auth.model.AuthModels.*;
import com.dayflow.auth.repo.AuthRepository;
import com.dayflow.auth.security.TokenService;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  public record Issued(LoginResponse response, String refreshToken, UUID sessionId) {}
  private static final String SAFE_ERROR="The provided credentials could not be verified.";
  private final AuthRepository repo; private final TokenService tokens; private final DayflowProperties props; private final MailService mail;
  private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12); private final SecureRandom random=new SecureRandom();
  public AuthService(AuthRepository repo,TokenService tokens,DayflowProperties props,MailService mail){this.repo=repo;this.tokens=tokens;this.props=props;this.mail=mail;}

  @Transactional
  public Issued login(LoginRequest request,String ip,String agent){
    String identifier=request.identifier()==null?"":request.identifier().trim(); String identifierHash=tokens.hash(identifier.toLowerCase()); String ipHash=tokens.hash(ip);
    var found=repo.findUser(identifier); if(found.isEmpty()){repo.loginAttempt(identifierHash,null,false,ipHash); progressiveDelay(1);throw new BadCredentialsException(SAFE_ERROR);}
    var user=found.get(); var now=Instant.now();
    if(user.lockedUntil()!=null&&user.lockedUntil().isAfter(now)) throw new BadCredentialsException("Account temporarily locked. Try again later.");
    boolean valid=user.passwordHash()!=null&&passwords.matches(request.password()==null?"":request.password(),user.passwordHash());
    if(!valid){int attempts=user.failedAttempts()+1; Instant lock=attempts>=5?now.plus(15,java.time.temporal.ChronoUnit.MINUTES):null;repo.failedLogin(user.id(),attempts,lock);repo.loginAttempt(identifierHash,user.id(),false,ipHash);repo.securityEvent(user.id(),"LOGIN_FAILED",attempts>=5?"HIGH":"LOW",ipHash,agent);progressiveDelay(attempts);throw new BadCredentialsException(SAFE_ERROR);}
    if(!user.emailVerified()||!"ACTIVE".equals(user.status())) throw new BadCredentialsException(SAFE_ERROR);
    if(user.roles().contains("ADMIN_HR")){sendOtp(user.email(),"ADMIN_LOGIN");return new Issued(new LoginResponse(null,0,principal(user),true),null,null);}
    repo.successfulLogin(user.id()); repo.loginAttempt(identifierHash,user.id(),true,ipHash); repo.securityEvent(user.id(),"LOGIN_SUCCESS","INFO",ipHash,agent); return issue(user,request.deviceName(),ip,agent);
  }
  @Transactional public Issued issue(User user,String device,String ip,String agent){String refresh=tokens.opaque();Instant expiry=Instant.now().plus(props.refreshTokenDays(),java.time.temporal.ChronoUnit.DAYS);UUID sid=repo.createRefreshSession(user.id(),tokens.hash(refresh),safe(device,"Browser"),tokens.hash(safe(agent,"unknown")),ip,expiry);return new Issued(new LoginResponse(tokens.access(user),props.accessTokenMinutes()*60L,principal(user),false),refresh,sid);}
  @Transactional public Issued refresh(String raw,String ip,String agent){if(raw==null)throw new BadCredentialsException("Session expired.");var row=repo.refreshSession(tokens.hash(raw)).orElseThrow(()->new BadCredentialsException("Session expired."));UUID old=(UUID)row.get("id"),uid=(UUID)row.get("user_id");if(row.get("revoked_at")!=null||((java.sql.Timestamp)row.get("expires_at")).toInstant().isBefore(Instant.now())){repo.revokeAll(uid);repo.securityEvent(uid,"REFRESH_REUSE","CRITICAL",tokens.hash(ip),agent);throw new BadCredentialsException("Session expired.");}var issued=issue(repo.findUser(uid).orElseThrow(),"Browser",ip,agent);repo.rotateSession(old,issued.sessionId());return issued;}
  public void sendOtp(String identifier,String purpose){repo.findUser(identifier).ifPresent(user->{String code=String.format("%06d",random.nextInt(1_000_000));repo.storeOtp(user.id(),purpose,tokens.hash(code),Instant.now().plus(10,java.time.temporal.ChronoUnit.MINUTES));mail.otp(user.email(),code,purpose);});}
  public void startActivation(ActivationStart request){repo.findPendingEmployee(request.employeeId(),request.companyEmail()).ifPresent(user->sendOtp(user.email(),"EMPLOYEE_ACTIVATION"));}
  @Transactional public void completeActivation(ActivationComplete request){if(!request.accepted())throw new IllegalArgumentException("Accept the privacy and usage policies to continue.");validatePassword(request.password());var user=repo.findPendingEmployee(request.employeeId(),request.companyEmail()).orElseThrow(()->new BadCredentialsException(SAFE_ERROR));if(!repo.consumeOtp(user.id(),"EMPLOYEE_ACTIVATION",tokens.hash(request.code())))throw new BadCredentialsException("The verification code is invalid or expired.");repo.activate(user.id(),passwords.encode(request.password()));repo.securityEvent(user.id(),"EMPLOYEE_ACTIVATED","INFO",null,null);}
  @Transactional public Optional<Issued> verifyOtp(OtpVerify request,String ip,String agent){var user=repo.findUser(request.identifier()).orElseThrow(()->new BadCredentialsException(SAFE_ERROR));if(!repo.consumeOtp(user.id(),request.purpose(),tokens.hash(request.code())))throw new BadCredentialsException("The verification code is invalid or expired.");if("ADMIN_LOGIN".equals(request.purpose()))return Optional.of(issue(user,"Verified browser",ip,agent));return Optional.empty();}
  public void forgot(String identifier){repo.findUser(identifier).ifPresent(user->{String raw=tokens.opaque();repo.storeReset(user.id(),tokens.hash(raw),Instant.now().plus(20,java.time.temporal.ChronoUnit.MINUTES));mail.otp(user.email(),raw,"PASSWORD_RESET_LINK_TOKEN");});}
  @Transactional public void reset(PasswordReset reset){validatePassword(reset.password());UUID id=repo.consumeReset(tokens.hash(reset.token())).orElseThrow(()->new BadCredentialsException("The reset link is invalid or expired."));repo.updatePassword(id,passwords.encode(reset.password()));repo.revokeAll(id);var user=repo.findUser(id).orElseThrow();repo.securityEvent(id,"PASSWORD_CHANGED","INFO",null,null);mail.passwordChanged(user.email());}
  public Principal me(UUID id){return principal(repo.findUser(id).orElseThrow());}
  public List<Map<String,Object>> sessions(UUID id){return repo.sessions(id);}
  public void revoke(UUID user,UUID session){repo.revokeSession(session,user);repo.securityEvent(user,"SESSION_REVOKED","INFO",null,null);}
  public List<Map<String,Object>> events(UUID id){return repo.securityEvents(id);}
  private Principal principal(User u){return new Principal(u.id(),u.employeeId(),u.email(),u.displayName(),u.roles());}
  private void progressiveDelay(int attempts){try{Thread.sleep(Math.min(1500,attempts*200L));}catch(InterruptedException e){Thread.currentThread().interrupt();}}
  private void validatePassword(String p){if(p==null||p.length()<12||!p.matches(".*[A-Z].*")||!p.matches(".*[a-z].*")||!p.matches(".*[0-9].*"))throw new IllegalArgumentException("Use at least 12 characters with uppercase, lowercase and a number.");}
  private String safe(String v,String fallback){return v==null||v.isBlank()?fallback:v.substring(0,Math.min(160,v.length()));}
}
