package com.dayflow.auth.web;

import java.net.URI;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth/passkeys")
public class PasskeyController {
  private final JdbcClient db; public PasskeyController(JdbcClient db){this.db=db;}
  @PostMapping("/register/options") ResponseEntity<Void> registerOptions(){return ResponseEntity.status(307).location(URI.create("/webauthn/register/options")).build();}
  @PostMapping("/register/verify") ResponseEntity<Void> registerVerify(){return ResponseEntity.status(307).location(URI.create("/webauthn/register")).build();}
  @PostMapping("/login/options") ResponseEntity<Void> loginOptions(){return ResponseEntity.status(307).location(URI.create("/webauthn/authenticate/options")).build();}
  @PostMapping("/login/verify") ResponseEntity<Void> loginVerify(){return ResponseEntity.status(307).location(URI.create("/login/webauthn")).build();}
  @GetMapping List<Map<String,Object>> list(@AuthenticationPrincipal Jwt jwt){String email=jwt.getClaimAsString("email");return db.sql("SELECT c.credential_id,c.label device_name,c.created,c.last_used FROM user_credentials c JOIN user_entities u ON u.id=c.user_entity_user_id WHERE lower(u.name)=lower(:e) ORDER BY c.created DESC").param("e",email).query().listOfRows();}
  @DeleteMapping("/{credentialId}") ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt,@PathVariable String credentialId){String email=jwt.getClaimAsString("email");int deleted=db.sql("DELETE FROM user_credentials c USING user_entities u WHERE c.user_entity_user_id=u.id AND lower(u.name)=lower(:e) AND c.credential_id=:id").param("e",email).param("id",credentialId).update();return deleted==1?ResponseEntity.noContent().build():ResponseEntity.notFound().build();}
}
