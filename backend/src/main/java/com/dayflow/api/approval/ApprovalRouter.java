package com.dayflow.api.approval;

import com.dayflow.api.employee.Employee;
import com.dayflow.api.user.UserRepository;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Shared routing rule for leave and attendance-correction approvals (spec sections 7/8: multi-
 * level approval routed to a manager, with an HR fallback). Route to the employee's manager if
 * the manager can act on it; otherwise fan out to every HR Admin/HR Officer so nothing is stuck
 * waiting on an assignment that was never made.
 */
@Component
public class ApprovalRouter {
  private final UserRepository userRepository;

  public ApprovalRouter(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public List<Long> routeApprovers(Employee employee, String requiredPermission) {
    if (employee.managerId() != null) {
      var managerAccount = userRepository.findByEmployeeId(employee.managerId());
      if (managerAccount.isPresent() && managerAccount.get().permissions().contains(requiredPermission)) {
        return List.of(managerAccount.get().id());
      }
    }
    return userRepository.findUserIdsByRoles(List.of("HR_ADMIN", "HR_OFFICER"));
  }
}
