package com.dayflow.api.dashboard;

import java.util.List;

record KpiCard(String key, String label, Long value, boolean available, String note, String href) {
}

record DepartmentCount(String department, long activeCount) {
}

record RecentActivityItem(String actor, String action, String entity, String createdAt) {
}

record AttentionItem(String severity, String title, String detail, String actionLabel, String href,
    String entityType, Long entityId) {
}

record UpcomingLeaveItem(String employeeName, String leaveTypeName, String startDate, String endDate) {
}

record DashboardSummary(
    String greeting,
    String currentDate,
    String lastSynchronizedAt,
    List<KpiCard> kpis,
    List<DepartmentCount> departmentBreakdown,
    boolean canViewActivity,
    List<RecentActivityItem> recentActivity,
    List<AttentionItem> needsAttention,
    boolean canViewAvailability,
    List<UpcomingLeaveItem> upcomingLeave) {
}
