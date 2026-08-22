package com.dayflow.api.insights;

import java.util.List;

public record AttritionRiskEntry(long employeeId, String employeeName, String departmentName, String riskLevel,
    int riskScore, List<String> signals) {
}
