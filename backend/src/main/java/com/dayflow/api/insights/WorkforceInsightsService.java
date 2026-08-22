package com.dayflow.api.insights;

import com.dayflow.api.security.CurrentUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Spec section 6 ("Intelligence"): both signals here are transparent, rule-based computations
 * over real Dayflow data (attendance, leave, tenure) — there is no ML/forecasting model or
 * external data source involved, so results are exactly as trustworthy as the underlying records
 * and the documented rules, not a black box.
 */
@Service
public class WorkforceInsightsService {
  private final WorkforceInsightsRepository repository;

  public WorkforceInsightsService(WorkforceInsightsRepository repository) {
    this.repository = repository;
  }

  public List<HeadcountPoint> headcountTrend(CurrentUser actor) {
    actor.require("insights:read");
    List<LocalDate> joiningDates = repository.joiningDatesForHeadcount();
    LocalDate now = LocalDate.now();
    List<Integer> counts = new ArrayList<>();
    List<HeadcountPoint> points = new ArrayList<>();
    for (int i = 5; i >= 0; i--) {
      LocalDate monthAnchor = now.minusMonths(i);
      LocalDate monthEnd = monthAnchor.withDayOfMonth(monthAnchor.lengthOfMonth());
      int count = (int) joiningDates.stream().filter(d -> !d.isAfter(monthEnd)).count();
      counts.add(count);
      points.add(new HeadcountPoint(periodLabel(monthAnchor), count, false));
    }
    double avgDelta = ((counts.get(5) - counts.get(4)) + (counts.get(4) - counts.get(3)) + (counts.get(3) - counts.get(2))) / 3.0;
    int last = counts.get(5);
    for (int i = 1; i <= 2; i++) {
      LocalDate projMonth = now.plusMonths(i);
      int projected = Math.max((int) Math.round(last + avgDelta * i), 0);
      points.add(new HeadcountPoint(periodLabel(projMonth), projected, true));
    }
    return points;
  }

  public List<AttritionRiskEntry> attritionRisk(CurrentUser actor) {
    actor.require("insights:read");
    LocalDate now = LocalDate.now();
    List<WorkforceInsightsRepository.EmployeeSnapshot> snapshots = repository.activeEmployeeSnapshots();
    Map<Long, Integer> lateCounts = repository.lateCountSince(now.minusDays(30));
    Map<Long, BigDecimal> leaveDays = repository.leaveDaysSince(now.minusDays(90));

    List<AttritionRiskEntry> entries = new ArrayList<>();
    for (WorkforceInsightsRepository.EmployeeSnapshot snap : snapshots) {
      List<String> signals = new ArrayList<>();
      int score = 0;
      long tenureMonths = snap.joiningDate() == null ? 0 : ChronoUnit.MONTHS.between(snap.joiningDate(), now);
      BigDecimal leaveTaken = leaveDays.getOrDefault(snap.id(), BigDecimal.ZERO);
      int lateCount = lateCounts.getOrDefault(snap.id(), 0);

      if (tenureMonths > 6 && leaveTaken.compareTo(BigDecimal.ZERO) == 0) {
        score += 40;
        signals.add("No approved leave in the last 90 days despite " + tenureMonths + " months' tenure");
      }
      if (lateCount >= 5) {
        score += 30;
        signals.add(lateCount + " late arrivals in the last 30 days");
      }
      if (snap.managerId() == null) {
        score += 20;
        signals.add("No manager assigned");
      }
      if (tenureMonths < 3) {
        score += 10;
        signals.add("New hire (" + tenureMonths + " month(s) tenure)");
      }
      if (score == 0) {
        continue;
      }
      String level = score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
      entries.add(new AttritionRiskEntry(snap.id(), snap.name(), snap.departmentName(), level, score, signals));
    }
    entries.sort((a, b) -> b.riskScore() - a.riskScore());
    return entries;
  }

  private String periodLabel(LocalDate date) {
    return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
  }
}
