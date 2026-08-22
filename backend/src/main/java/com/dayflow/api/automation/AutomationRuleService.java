package com.dayflow.api.automation;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AutomationRuleService {
  private static final Logger log = LoggerFactory.getLogger(AutomationRuleService.class);

  private final AutomationRuleRepository ruleRepository;
  private final AutomationExecutionRepository executionRepository;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;
  private final Map<String, AutomationHandler> handlersByCode;

  public AutomationRuleService(AutomationRuleRepository ruleRepository, AutomationExecutionRepository executionRepository,
      AuditService auditService, ObjectMapper objectMapper, List<AutomationHandler> handlers) {
    this.ruleRepository = ruleRepository;
    this.executionRepository = executionRepository;
    this.auditService = auditService;
    this.objectMapper = objectMapper;
    this.handlersByCode = handlers.stream().collect(Collectors.toMap(AutomationHandler::code, h -> h));
  }

  public List<AutomationRule> list(CurrentUser actor) {
    actor.require("automation:read");
    return ruleRepository.findAll();
  }

  public List<AutomationExecution> history(CurrentUser actor, long ruleId, int limit) {
    actor.require("automation:read");
    return executionRepository.forRule(ruleId, limit);
  }

  @Transactional
  public AutomationRule setActive(CurrentUser actor, long id, boolean active) {
    actor.require("automation:write");
    AutomationRule before = requireRule(id);
    if (before.highRisk() && active) {
      // High-risk rules still require the same explicit action as any other toggle, but the
      // audit reason makes the elevated risk visible to reviewers (spec: "Approval requirement
      // for high-risk automations").
      auditService.record(actor.userId(), "ENABLE_HIGH_RISK_AUTOMATION", "AutomationRule", String.valueOf(id), before, null, null);
    }
    ruleRepository.setActive(id, active);
    AutomationRule after = requireRule(id);
    auditService.record(actor.userId(), active ? "ENABLE_AUTOMATION" : "DISABLE_AUTOMATION", "AutomationRule",
        String.valueOf(id), before, after, null);
    return after;
  }

  @Transactional
  public AutomationRule setTestMode(CurrentUser actor, long id, boolean testMode) {
    actor.require("automation:write");
    ruleRepository.setTestMode(id, testMode);
    auditService.record(actor.userId(), "SET_AUTOMATION_TEST_MODE", "AutomationRule", String.valueOf(id), null,
        Map.of("testMode", testMode), null);
    return requireRule(id);
  }

  @Transactional
  public AutomationRule updateConfig(CurrentUser actor, long id, String configJson) {
    actor.require("automation:write");
    JsonNode parsed;
    try {
      parsed = objectMapper.readTree(configJson);
    } catch (Exception ex) {
      throw ApiException.badRequest("Config must be valid JSON.");
    }
    AutomationRule before = requireRule(id);
    ruleRepository.updateConfig(id, parsed.toString());
    AutomationRule after = requireRule(id);
    auditService.record(actor.userId(), "UPDATE_AUTOMATION_CONFIG", "AutomationRule", String.valueOf(id), before, after, null);
    return after;
  }

  @Transactional
  public AutomationExecution runNow(CurrentUser actor, long id, boolean dryRun) {
    actor.require("automation:run");
    AutomationRule rule = requireRule(id);
    AutomationExecution execution = execute(rule, dryRun || rule.testMode());
    auditService.record(actor.userId(), dryRun ? "DRY_RUN_AUTOMATION" : "RUN_AUTOMATION", "AutomationRule",
        String.valueOf(id), null, execution, null);
    return execution;
  }

  /** Every 15 minutes, run every active SCHEDULED-trigger rule (each honors its own test-mode flag). */
  @Scheduled(fixedRate = 15 * 60 * 1000L)
  @Transactional
  void runDueRules() {
    for (AutomationRule rule : ruleRepository.findActiveByTrigger("SCHEDULED")) {
      try {
        execute(rule, rule.testMode());
      } catch (Exception ex) {
        log.error("Automation rule {} failed during scheduled run", rule.code(), ex);
      }
    }
  }

  private AutomationExecution execute(AutomationRule rule, boolean dryRun) {
    AutomationHandler handler = handlersByCode.get(rule.code());
    if (handler == null) {
      throw new IllegalStateException("No handler registered for automation rule code " + rule.code());
    }
    LocalDateTime startedAt = LocalDateTime.now();
    String status;
    AutomationHandler.HandlerResult result;
    String errorMessage = null;
    try {
      JsonNode config = objectMapper.readTree(rule.config());
      result = handler.run(config, dryRun);
      status = dryRun ? "DRY_RUN" : "SUCCESS";
    } catch (Exception ex) {
      log.error("Automation rule {} threw during execution", rule.code(), ex);
      result = new AutomationHandler.HandlerResult(0, 0, null);
      status = dryRun ? "DRY_RUN" : "FAILURE";
      errorMessage = ex.getMessage();
    }
    LocalDateTime finishedAt = LocalDateTime.now();
    ruleRepository.recordRun(rule.id(), errorMessage == null, !dryRun);
    long executionId = executionRepository.create(rule.id(), startedAt, finishedAt, status, result.matchedCount(),
        result.actionCount(), result.detail(), errorMessage);
    return new AutomationExecution(executionId, rule.id(), startedAt, finishedAt, status, result.matchedCount(),
        result.actionCount(), result.detail(), errorMessage);
  }

  private AutomationRule requireRule(long id) {
    return ruleRepository.findById(id).orElseThrow(() -> ApiException.notFound("Automation rule not found."));
  }
}
