package com.dayflow.api.policy;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.security.CurrentUser;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PolicyService {
  private final PolicyRepository policyRepository;
  private final AuditService auditService;

  public PolicyService(PolicyRepository policyRepository, AuditService auditService) {
    this.policyRepository = policyRepository;
    this.auditService = auditService;
  }

  public List<Policy> list(CurrentUser actor, String category, String keyword) {
    actor.require("policy:read");
    return policyRepository.search(category, keyword);
  }

  public Policy get(CurrentUser actor, long id) {
    actor.require("policy:read");
    return policyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Policy not found."));
  }

  @Transactional
  public Policy create(CurrentUser actor, CreatePolicyRequest request) {
    actor.require("policy:manage");
    if (policyRepository.existsByCode(request.code())) {
      throw ApiException.conflict("A policy with this code already exists.");
    }
    long id = policyRepository.create(request.code(), request.title(), request.category(), request.body(), request.effectiveDate());
    Policy created = policyRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_POLICY", "Policy", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public Policy update(CurrentUser actor, long id, UpdatePolicyRequest request) {
    actor.require("policy:manage");
    Policy before = policyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Policy not found."));
    policyRepository.update(id, request.title(), request.category(), request.body(), request.effectiveDate());
    Policy after = policyRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "UPDATE_POLICY", "Policy", String.valueOf(id), before, after, null);
    return after;
  }

  @Transactional
  public Policy setActive(CurrentUser actor, long id, boolean active) {
    actor.require("policy:manage");
    Policy before = policyRepository.findById(id).orElseThrow(() -> ApiException.notFound("Policy not found."));
    policyRepository.setActive(id, active);
    Policy after = policyRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), active ? "ACTIVATE_POLICY" : "ARCHIVE_POLICY", "Policy", String.valueOf(id), before, after, null);
    return after;
  }
}
