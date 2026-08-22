package com.dayflow.api.assistant;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
  private final AssistantService assistantService;

  public AssistantController(AssistantService assistantService) {
    this.assistantService = assistantService;
  }

  @PostMapping("/ask")
  public ResponseEntity<ApiResponse<AssistantInteraction>> ask(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody AskRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(assistantService.ask(user, request)));
  }

  @PostMapping("/escalate")
  public ResponseEntity<ApiResponse<AssistantInteraction>> escalate(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody AssistantEscalateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(assistantService.escalate(user, request)));
  }

  @GetMapping("/history")
  public ApiResponse<List<AssistantInteraction>> history(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(assistantService.history(user));
  }
}
