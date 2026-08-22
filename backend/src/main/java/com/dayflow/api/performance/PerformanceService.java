package com.dayflow.api.performance;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.security.CurrentUser;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PerformanceService {
  private final GoalRepository goalRepository;
  private final PerformanceReviewRepository reviewRepository;
  private final EmployeeRepository employeeRepository;
  private final AuditService auditService;

  public PerformanceService(GoalRepository goalRepository, PerformanceReviewRepository reviewRepository,
      EmployeeRepository employeeRepository, AuditService auditService) {
    this.goalRepository = goalRepository;
    this.reviewRepository = reviewRepository;
    this.employeeRepository = employeeRepository;
    this.auditService = auditService;
  }

  public List<Goal> goals(CurrentUser actor, long employeeId) {
    assertCanView(actor, employeeRepository.requireById(employeeId));
    return goalRepository.forEmployee(employeeId);
  }

  @Transactional
  public Goal createGoal(CurrentUser actor, CreateGoalRequest request) {
    Employee employee = employeeRepository.requireById(request.employeeId());
    assertCanManage(actor, employee);
    long id = goalRepository.create(employee.id(), request.title(), request.description(),
        request.category() == null || request.category().isBlank() ? "Individual" : request.category(),
        request.dueDate(), actor.userId());
    Goal created = goalRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_GOAL", "Goal", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public Goal updateGoalProgress(CurrentUser actor, long goalId, UpdateGoalProgressRequest request) {
    Goal goal = goalRepository.findById(goalId).orElseThrow(() -> ApiException.notFound("Goal not found."));
    Employee employee = employeeRepository.requireById(goal.employeeId());
    boolean isOwner = actor.employeeId() == employee.id() && actor.has("performance:read:own");
    if (!isOwner) {
      assertCanManage(actor, employee);
    }
    goalRepository.updateProgress(goalId, request.progressPercent(), request.status());
    Goal after = goalRepository.findById(goalId).orElseThrow();
    auditService.record(actor.userId(), "UPDATE_GOAL_PROGRESS", "Goal", String.valueOf(goalId), goal, after, null);
    return after;
  }

  public List<PerformanceReview> reviews(CurrentUser actor, long employeeId) {
    assertCanView(actor, employeeRepository.requireById(employeeId));
    return reviewRepository.forEmployee(employeeId);
  }

  @Transactional
  public PerformanceReview startReview(CurrentUser actor, StartReviewRequest request) {
    Employee employee = employeeRepository.requireById(request.employeeId());
    assertCanManage(actor, employee);
    long id = reviewRepository.create(employee.id(), actor.userId(), request.cycle());
    PerformanceReview created = reviewRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "START_REVIEW", "PerformanceReview", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public PerformanceReview submitReview(CurrentUser actor, long reviewId, SubmitReviewRequest request) {
    PerformanceReview review = requireReview(reviewId);
    if (review.reviewerUserId() != actor.userId() && !actor.has("performance:manage")) {
      throw ApiException.forbidden("Only the assigned reviewer can submit this review.");
    }
    if (!"DRAFT".equals(review.status())) {
      throw ApiException.conflict("This review has already been submitted.");
    }
    reviewRepository.submit(reviewId, request.rating(), request.strengths(), request.improvements(), request.managerComments());
    PerformanceReview after = requireReview(reviewId);
    auditService.record(actor.userId(), "SUBMIT_REVIEW", "PerformanceReview", String.valueOf(reviewId), review, after, null);
    return after;
  }

  @Transactional
  public PerformanceReview acknowledgeReview(CurrentUser actor, long reviewId) {
    PerformanceReview review = requireReview(reviewId);
    if (actor.employeeId() != review.employeeId()) {
      throw ApiException.forbidden("Only the reviewed employee can acknowledge this review.");
    }
    if (!"SUBMITTED".equals(review.status())) {
      throw ApiException.conflict("This review isn't awaiting acknowledgement.");
    }
    reviewRepository.acknowledge(reviewId);
    return requireReview(reviewId);
  }

  private PerformanceReview requireReview(long id) {
    return reviewRepository.findById(id).orElseThrow(() -> ApiException.notFound("Review not found."));
  }

  private void assertCanView(CurrentUser actor, Employee employee) {
    if (actor.has("performance:read") || actor.employeeId() == employee.id()) {
      return;
    }
    if (actor.has("performance:manage:reports") && Objects.equals(employee.managerId(), actor.employeeId())) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to view this employee's performance data.");
  }

  private void assertCanManage(CurrentUser actor, Employee employee) {
    if (actor.has("performance:manage")) {
      return;
    }
    if (actor.has("performance:manage:reports") && Objects.equals(employee.managerId(), actor.employeeId())) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to manage this employee's performance data.");
  }
}
