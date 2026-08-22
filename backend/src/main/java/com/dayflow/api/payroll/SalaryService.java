package com.dayflow.api.payroll;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.security.CurrentUser;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Salary structures are deliberately owned separately from payroll runs (spec section 2:
 * "Payroll permissions must be separated from general HR permissions"): HR Admin decides what
 * someone is paid, Payroll Officer runs the cycle against whatever is configured.
 */
@Service
public class SalaryService {
  private final SalaryStructureRepository salaryStructureRepository;
  private final EmployeeRepository employeeRepository;
  private final AuditService auditService;

  public SalaryService(SalaryStructureRepository salaryStructureRepository, EmployeeRepository employeeRepository,
      AuditService auditService) {
    this.salaryStructureRepository = salaryStructureRepository;
    this.employeeRepository = employeeRepository;
    this.auditService = auditService;
  }

  public List<SalaryStructure> history(CurrentUser actor, long employeeId) {
    actor.require("salary:read");
    employeeRepository.requireById(employeeId);
    return salaryStructureRepository.historyForEmployee(employeeId);
  }

  @Transactional
  public SalaryStructure create(CurrentUser actor, long employeeId, CreateSalaryStructureRequest request) {
    actor.require("salary:write");
    Employee employee = employeeRepository.requireById(employeeId);
    BigDecimal hra = request.hraMonthly() == null ? BigDecimal.ZERO : request.hraMonthly();
    BigDecimal allowances = request.allowancesMonthly() == null ? BigDecimal.ZERO : request.allowancesMonthly();
    BigDecimal deductions = request.recurringDeductionsMonthly() == null ? BigDecimal.ZERO : request.recurringDeductionsMonthly();
    if (request.basicMonthly().signum() < 0 || hra.signum() < 0 || allowances.signum() < 0 || deductions.signum() < 0) {
      throw ApiException.badRequest("Salary components cannot be negative.");
    }

    salaryStructureRepository.supersede(employeeId, request.effectiveFrom());
    long id = salaryStructureRepository.create(employeeId, request.effectiveFrom(), request.basicMonthly(), hra,
        allowances, deductions, request.reason(), actor.userId());
    SalaryStructure created = salaryStructureRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_SALARY_STRUCTURE", "Employee", String.valueOf(employeeId), null,
        created, request.reason());
    return created;
  }

  @Transactional
  public Employee updateVerificationFlags(CurrentUser actor, long employeeId, VerificationFlagsRequest request) {
    actor.require("salary:write");
    Employee before = employeeRepository.requireById(employeeId);
    employeeRepository.setPayrollVerificationFlags(employeeId, request.bankVerified(), request.taxIdVerified());
    Employee after = employeeRepository.requireById(employeeId);
    auditService.record(actor.userId(), "UPDATE_PAYROLL_VERIFICATION", "Employee", String.valueOf(employeeId), before, after, null);
    return after;
  }
}
