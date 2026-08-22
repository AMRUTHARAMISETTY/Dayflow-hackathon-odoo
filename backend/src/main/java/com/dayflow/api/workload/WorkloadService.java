package com.dayflow.api.workload;

import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.team.TeamRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class WorkloadService {
  private final WorkloadRepository workloadRepository;
  private final TeamRepository teamRepository;

  public WorkloadService(WorkloadRepository workloadRepository, TeamRepository teamRepository) {
    this.workloadRepository = workloadRepository;
    this.teamRepository = teamRepository;
  }

  public List<WorkloadRow> workload(CurrentUser actor, Long teamId, LocalDate from, LocalDate to) {
    actor.require("workload:read");
    if (teamId != null) teamRepository.requireById(teamId);
    LocalDate start = from == null ? LocalDate.now() : from;
    LocalDate end = to == null ? start.plusDays(6) : to;
    return workloadRepository.teamWorkload(teamId, start, end);
  }
}
