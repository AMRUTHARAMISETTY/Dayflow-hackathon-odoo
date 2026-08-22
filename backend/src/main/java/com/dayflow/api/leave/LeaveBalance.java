package com.dayflow.api.leave;

import java.math.BigDecimal;

public record LeaveBalance(long employeeId, long leaveTypeId, String leaveTypeName, BigDecimal balance) {
}
