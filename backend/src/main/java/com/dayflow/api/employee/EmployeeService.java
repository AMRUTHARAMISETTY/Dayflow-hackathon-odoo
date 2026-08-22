package com.dayflow.api.employee;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.department.DepartmentRepository;
import com.dayflow.api.security.CurrentUser;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every read here is scoped by the caller's permissions, matching spec section 2:
 * HR roles with `employee:read` see everyone; a Manager with `employee:read:reports`
 * sees only themself and their direct reports; a plain Employee with `employee:read:own`
 * sees only themself. Sensitive field changes always require a reason and are captured
 * in the immutable job-history table in addition to the general audit log.
 */
@Service
public class EmployeeService {
  private final EmployeeRepository employeeRepository;
  private final DepartmentRepository departmentRepository;
  private final AuditService auditService;

  public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository,
      AuditService auditService) {
    this.employeeRepository = employeeRepository;
    this.departmentRepository = departmentRepository;
    this.auditService = auditService;
  }

  public PageResponse<Employee> search(CurrentUser actor, EmployeeRepository.SearchFilters filters, int page, int size) {
    if (actor.has("employee:read")) {
      return employeeRepository.search(filters, null, null, page, size);
    }
    if (actor.has("employee:read:reports")) {
      return employeeRepository.search(filters, actor.employeeId(), actor.employeeId(), page, size);
    }
    if (actor.has("employee:read:own")) {
      return employeeRepository.search(filters, actor.employeeId(), null, page, size);
    }
    throw ApiException.forbidden("You do not have permission to view the employee directory.");
  }

  public Employee getById(CurrentUser actor, long id) {
    Employee employee = employeeRepository.requireById(id);
    assertCanView(actor, employee);
    return employee;
  }

  public List<EmployeeJobHistoryEntry> history(CurrentUser actor, long id) {
    Employee employee = employeeRepository.requireById(id);
    assertCanView(actor, employee);
    return employeeRepository.history(id);
  }

  public List<Employee> orgChart(CurrentUser actor) {
    actor.require("orgchart:read");
    return employeeRepository.orgChart();
  }

  @Transactional
  public Employee create(CurrentUser actor, CreateEmployeeRequest request) {
    actor.require("employee:write");
    if (employeeRepository.existsByEmail(request.email())) {
      throw ApiException.conflict("An employee with this email already exists.");
    }
    if (request.departmentId() != null && departmentRepository.findById(request.departmentId()).isEmpty()) {
      throw ApiException.badRequest("Unknown department.");
    }
    if (request.managerId() != null && employeeRepository.findById(request.managerId()).isEmpty()) {
      throw ApiException.badRequest("Unknown manager.");
    }
    long id = employeeRepository.create(request.name(), request.email(), request.phone(), request.departmentId(),
        request.designation(), request.managerId(), request.location(), request.employmentType(), "Onboarding",
        request.joiningDate());
    Employee created = employeeRepository.requireById(id);
    employeeRepository.insertJobHistory(id, created.departmentId(), created.designation(), created.managerId(),
        created.employmentType(), created.status(), LocalDate.now(), "CREATED", "Employee record created by HR",
        actor.userId());
    auditService.record(actor.userId(), "CREATE_EMPLOYEE", "Employee", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public Employee updateBasic(CurrentUser actor, long id, BasicUpdateRequest request) {
    actor.require("employee:write");
    Employee before = employeeRepository.requireById(id);
    employeeRepository.updateBasicFields(id, request.phone(), before.designation(), before.location());
    Employee after = employeeRepository.requireById(id);
    auditService.record(actor.userId(), "UPDATE_EMPLOYEE_BASIC", "Employee", String.valueOf(id), before, after, null);
    return after;
  }

  @Transactional
  public Employee updateSensitive(CurrentUser actor, long id, SensitiveUpdateRequest request) {
    actor.require("employee:write:sensitive");
    Employee before = employeeRepository.requireById(id);
    Long departmentId = request.departmentId() != null ? request.departmentId() : before.departmentId();
    Long managerId = request.managerId() != null ? request.managerId() : before.managerId();
    String designation = request.designation() != null ? request.designation() : before.designation();
    String location = request.location() != null ? request.location() : before.location();
    String employmentType = request.employmentType() != null ? request.employmentType() : before.employmentType();
    if (managerId != null && managerId == id) {
      throw ApiException.badRequest("An employee cannot be their own manager.");
    }
    if (departmentId != null && departmentRepository.findById(departmentId).isEmpty()) {
      throw ApiException.badRequest("Unknown department.");
    }
    LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : LocalDate.now();

    employeeRepository.applySensitiveChange(id, departmentId, managerId, employmentType, before.status());
    employeeRepository.updateBasicFields(id, before.phone(), designation, location);
    Employee after = employeeRepository.requireById(id);

    String changeType = classifyChange(before, after);
    employeeRepository.insertJobHistory(id, after.departmentId(), after.designation(), after.managerId(),
        after.employmentType(), after.status(), effectiveDate, changeType, request.reason(), actor.userId());
    auditService.record(actor.userId(), "UPDATE_EMPLOYEE_JOB", "Employee", String.valueOf(id), before, after, request.reason());
    return after;
  }

  @Transactional
  public Employee suspend(CurrentUser actor, long id, StatusChangeRequest request) {
    actor.require("employee:suspend");
    return transitionStatus(actor, id, "Suspended", "SUSPENSION", request);
  }

  @Transactional
  public Employee reactivate(CurrentUser actor, long id, StatusChangeRequest request) {
    actor.require("employee:suspend");
    return transitionStatus(actor, id, "Active", "REACTIVATION", request);
  }

  @Transactional
  public Employee archive(CurrentUser actor, long id, StatusChangeRequest request) {
    actor.require("employee:archive");
    return transitionStatus(actor, id, "Archived", "ARCHIVE", request);
  }

  private Employee transitionStatus(CurrentUser actor, long id, String newStatus, String changeType,
      StatusChangeRequest request) {
    Employee before = employeeRepository.requireById(id);
    if (before.status().equals(newStatus)) {
      throw ApiException.conflict("Employee is already in status " + newStatus + ".");
    }
    employeeRepository.applySensitiveChange(id, before.departmentId(), before.managerId(), before.employmentType(), newStatus);
    Employee after = employeeRepository.requireById(id);
    LocalDate effectiveDate = request.effectiveDate() != null ? request.effectiveDate() : LocalDate.now();
    employeeRepository.insertJobHistory(id, after.departmentId(), after.designation(), after.managerId(),
        after.employmentType(), after.status(), effectiveDate, changeType, request.reason(), actor.userId());
    auditService.record(actor.userId(), "EMPLOYEE_" + changeType, "Employee", String.valueOf(id), before, after, request.reason());
    return after;
  }

  private String classifyChange(Employee before, Employee after) {
    boolean deptOrManagerOrLocationChanged = !Objects.equals(before.departmentId(), after.departmentId())
        || !Objects.equals(before.managerId(), after.managerId())
        || !Objects.equals(before.location(), after.location());
    boolean designationChanged = !Objects.equals(before.designation(), after.designation());
    if (deptOrManagerOrLocationChanged) {
      return "TRANSFER";
    }
    if (designationChanged) {
      return "PROMOTION";
    }
    return "UPDATE";
  }

  private void assertCanView(CurrentUser actor, Employee employee) {
    if (actor.has("employee:read")) {
      return;
    }
    if (actor.employeeId() == employee.id()) {
      return;
    }
    if (actor.has("employee:read:reports") && Objects.equals(employee.managerId(), actor.employeeId())) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to view this employee.");
  }
}
