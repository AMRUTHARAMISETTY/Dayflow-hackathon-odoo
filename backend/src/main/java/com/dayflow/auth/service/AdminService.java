package com.dayflow.auth.service;

import com.dayflow.auth.security.TokenService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
  public record InviteRequest(String name,String companyEmail,Set<String> permissions) {}
  private final JdbcClient db; private final TokenService tokens; private final MailService mail;
  public AdminService(JdbcClient db,TokenService tokens,MailService mail){this.db=db;this.tokens=tokens;this.mail=mail;}
  @Transactional public UUID invite(UUID actor,InviteRequest r){String raw=tokens.opaque();UUID id=db.sql("INSERT INTO hr_invitations(email,name,permissions,token_hash,invited_by,expires_at) VALUES(:e,:n,CAST(:p AS jsonb),:t,:a,:x) RETURNING id").param("e",r.companyEmail().toLowerCase()).param("n",r.name()).param("p",toJson(r.permissions())).param("t",tokens.hash(raw)).param("a",actor).param("x",Instant.now().plus(48,ChronoUnit.HOURS)).query(UUID.class).single();audit(actor,null,"HR_INVITED",Map.of("invitationId",id.toString()));mail.invitation(r.companyEmail(),raw);return id;}
  public List<Map<String,Object>> invitations(){return db.sql("SELECT id,email,name,permissions,expires_at,accepted_at,cancelled_at,created_at FROM hr_invitations ORDER BY created_at DESC").query().listOfRows();}
  @Transactional public void resend(UUID actor,UUID id){var invitation=db.sql("SELECT email FROM hr_invitations WHERE id=:id AND accepted_at IS NULL AND cancelled_at IS NULL").param("id",id).query().singleRow();String raw=tokens.opaque();db.sql("UPDATE hr_invitations SET token_hash=:h,expires_at=:e WHERE id=:id").param("h",tokens.hash(raw)).param("e",Instant.now().plus(48,ChronoUnit.HOURS)).param("id",id).update();mail.invitation(String.valueOf(invitation.get("email")),raw);audit(actor,null,"HR_INVITATION_RESENT",Map.of("invitationId",id.toString()));}
  @Transactional public void cancel(UUID actor,UUID id){db.sql("UPDATE hr_invitations SET cancelled_at=now() WHERE id=:id AND accepted_at IS NULL").param("id",id).update();audit(actor,null,"HR_INVITATION_CANCELLED",Map.of("invitationId",id.toString()));}
  @Transactional public void status(UUID actor,UUID user,String status){if(!Set.of("ACTIVE","SUSPENDED","DEACTIVATED","LOCKED").contains(status))throw new IllegalArgumentException("Invalid account status.");db.sql("UPDATE users SET status=:s,updated_at=now() WHERE id=:u").param("s",status).param("u",user).update();if(!"ACTIVE".equals(status))db.sql("UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=:u AND revoked_at IS NULL").param("u",user).update();audit(actor,user,"USER_STATUS_CHANGED",Map.of("status",status));}
  private void audit(UUID actor,UUID target,String action,Map<String,String> metadata){db.sql("INSERT INTO audit_logs(actor_user_id,target_user_id,action,metadata) VALUES(:a,:t,:x,CAST(:m AS jsonb))").param("a",actor).param("t",target).param("x",action).param("m",toJson(metadata)).update();}
  private String toJson(Object value){if(value instanceof Set<?> set)return set.stream().map(v->"\""+clean(String.valueOf(v))+"\"").collect(java.util.stream.Collectors.joining(",","[","]"));if(value instanceof Map<?,?> map)return map.entrySet().stream().map(e->"\""+clean(String.valueOf(e.getKey()))+"\":\""+clean(String.valueOf(e.getValue()))+"\"").collect(java.util.stream.Collectors.joining(",","{","}"));return "{}";}
  private String clean(String value){return value.replace("\\","\\\\").replace("\"","\\\"");}
}
