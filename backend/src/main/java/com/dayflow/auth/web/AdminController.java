package com.dayflow.auth.web;

import com.dayflow.auth.service.AdminService;
import java.net.URI;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin") @PreAuthorize("hasRole('ADMIN_HR')")
public class AdminController {
  private final AdminService admin; public AdminController(AdminService admin){this.admin=admin;}
  @PostMapping("/hr/invitations") public ResponseEntity<Map<String,UUID>> invite(@AuthenticationPrincipal Jwt jwt,@RequestBody AdminService.InviteRequest body){UUID id=admin.invite(id(jwt),body);return ResponseEntity.created(URI.create("/api/admin/hr/invitations/"+id)).body(Map.of("id",id));}
  @GetMapping("/hr/invitations") public List<Map<String,Object>> invitations(){return admin.invitations();}
  @PostMapping("/hr/invitations/{id}/resend") public ResponseEntity<Void> resend(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){admin.resend(id(jwt),id);return ResponseEntity.noContent().build();}
  @DeleteMapping("/hr/invitations/{id}") public ResponseEntity<Void> cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID id){admin.cancel(id(jwt),id);return ResponseEntity.noContent().build();}
  @PatchMapping("/users/{userId}/status") public ResponseEntity<Void> status(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID userId,@RequestBody Map<String,String> body){admin.status(id(jwt),userId,body.get("status"));return ResponseEntity.noContent().build();}
  private UUID id(Jwt jwt){return UUID.fromString(jwt.getSubject());}
}
