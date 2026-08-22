package com.dayflow.api.team;

import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class TeamRepository {
  private final JdbcTemplate jdbc;

  public TeamRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public PageResponse<Team> search(String q, String type, Long departmentId, int page, int size) {
    String like = "%" + (q == null ? "" : q.toLowerCase()) + "%";
    List<Team> rows = jdbc.query("""
        select t.*, d.name department_name, owner.name owner_name, lead.name lead_name, deputy.name deputy_lead_name,
          (select count(*) from team_memberships tm where tm.team_id = t.id and tm.active = true) member_count,
          (select count(*) from tasks task where task.team_id = t.id and task.status not in ('Completed')) active_task_count
        from teams t
        left join departments d on d.id = t.department_id
        left join employees owner on owner.id = t.owner_employee_id
        left join employees lead on lead.id = t.lead_employee_id
        left join employees deputy on deputy.id = t.deputy_lead_employee_id
        where (? is null or t.type = ?)
          and (? is null or t.department_id = ?)
          and (lower(t.name) like ? or lower(t.code) like ? or lower(coalesce(t.objective,'')) like ?)
        order by t.name limit ? offset ?
        """, this::mapTeam, blank(type), blank(type), departmentId, departmentId, like, like, like, size, page * size);
    Long total = jdbc.queryForObject("""
        select count(*) from teams t
        where (? is null or t.type = ?)
          and (? is null or t.department_id = ?)
          and (lower(t.name) like ? or lower(t.code) like ? or lower(coalesce(t.objective,'')) like ?)
        """, Long.class, blank(type), blank(type), departmentId, departmentId, like, like, like);
    return new PageResponse<>(rows, page, size, total == null ? 0 : total);
  }

  public Optional<Team> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject("""
          select t.*, d.name department_name, owner.name owner_name, lead.name lead_name, deputy.name deputy_lead_name,
            (select count(*) from team_memberships tm where tm.team_id = t.id and tm.active = true) member_count,
            (select count(*) from tasks task where task.team_id = t.id and task.status not in ('Completed')) active_task_count
          from teams t
          left join departments d on d.id = t.department_id
          left join employees owner on owner.id = t.owner_employee_id
          left join employees lead on lead.id = t.lead_employee_id
          left join employees deputy on deputy.id = t.deputy_lead_employee_id
          where t.id = ?
          """, this::mapTeam, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Team requireById(long id) {
    return findById(id).orElseThrow(() -> ApiException.notFound("Team not found."));
  }

  public boolean existsByCode(String code) {
    Integer count = jdbc.queryForObject("select count(*) from teams where lower(code) = lower(?)", Integer.class, code);
    return count != null && count > 0;
  }

  public long create(CreateTeamRequest request) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into teams(name, code, type, description, objective, department_id, location, cost_center,
            owner_employee_id, lead_employee_id, deputy_lead_employee_id, start_date, end_date, working_days,
            time_zone, default_shift_id, visibility, capacity_hours_per_week, notification_settings)
          values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          """, new String[] {"id"});
      ps.setString(1, request.name());
      ps.setString(2, request.code());
      ps.setString(3, request.type());
      ps.setString(4, request.description());
      ps.setString(5, request.objective());
      setLong(ps, 6, request.departmentId());
      ps.setString(7, request.location());
      ps.setString(8, request.costCenter());
      setLong(ps, 9, request.ownerEmployeeId());
      setLong(ps, 10, request.leadEmployeeId());
      setLong(ps, 11, request.deputyLeadEmployeeId());
      ps.setObject(12, request.startDate());
      ps.setObject(13, request.endDate());
      ps.setString(14, request.workingDays() == null || request.workingDays().isBlank() ? "MON,TUE,WED,THU,FRI" : request.workingDays());
      ps.setString(15, request.timeZone() == null || request.timeZone().isBlank() ? "Asia/Kolkata" : request.timeZone());
      setLong(ps, 16, request.defaultShiftId());
      ps.setString(17, request.visibility() == null || request.visibility().isBlank() ? "Internal" : request.visibility());
      ps.setBigDecimal(18, request.capacityHoursPerWeek() == null ? new BigDecimal("40.00") : request.capacityHoursPerWeek());
      ps.setString(19, request.notificationSettings());
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void addMember(long teamId, MemberSelection member) {
    jdbc.update("""
        insert into team_memberships(team_id, employee_id, team_role, allocation_percent, effective_from,
          effective_to, temporary_cover_employee_id, delegation_note)
        values(?,?,?,?,?,?,?,?)
        """, teamId, member.employeeId(), member.teamRole(),
        member.allocationPercent() == null ? new BigDecimal("100.00") : member.allocationPercent(),
        member.effectiveFrom() == null ? java.time.LocalDate.now() : member.effectiveFrom(),
        member.effectiveTo(), member.temporaryCoverEmployeeId(), member.delegationNote());
  }

  public List<TeamMember> members(long teamId) {
    return jdbc.query("""
        select tm.*, e.name employee_name, d.name department_name, e.designation,
          cover.name temporary_cover_name
        from team_memberships tm
        join employees e on e.id = tm.employee_id
        left join departments d on d.id = e.department_id
        left join employees cover on cover.id = tm.temporary_cover_employee_id
        where tm.team_id = ?
        order by tm.active desc, tm.team_role, e.name
        """, this::mapMember, teamId);
  }

  public boolean isMemberOrLead(long teamId, long employeeId) {
    Integer count = jdbc.queryForObject("""
        select count(*) from teams t
        where t.id = ? and (t.owner_employee_id = ? or t.lead_employee_id = ? or t.deputy_lead_employee_id = ?
          or exists(select 1 from team_memberships tm where tm.team_id = t.id and tm.employee_id = ? and tm.active = true))
        """, Integer.class, teamId, employeeId, employeeId, employeeId, employeeId);
    return count != null && count > 0;
  }

  private Team mapTeam(ResultSet rs, int row) throws SQLException {
    return new Team(rs.getLong("id"), rs.getString("name"), rs.getString("code"), rs.getString("type"),
        rs.getString("description"), rs.getString("objective"), nullableLong(rs, "department_id"),
        rs.getString("department_name"), rs.getString("location"), rs.getString("cost_center"),
        nullableLong(rs, "owner_employee_id"), rs.getString("owner_name"),
        nullableLong(rs, "lead_employee_id"), rs.getString("lead_name"),
        nullableLong(rs, "deputy_lead_employee_id"), rs.getString("deputy_lead_name"),
        rs.getObject("start_date", java.time.LocalDate.class), rs.getObject("end_date", java.time.LocalDate.class),
        rs.getString("working_days"), rs.getString("time_zone"), nullableLong(rs, "default_shift_id"),
        rs.getString("visibility"), rs.getBigDecimal("capacity_hours_per_week"),
        rs.getString("notification_settings"), rs.getBoolean("active"), rs.getInt("member_count"),
        rs.getInt("active_task_count"), rs.getTimestamp("created_at").toLocalDateTime());
  }

  private TeamMember mapMember(ResultSet rs, int row) throws SQLException {
    return new TeamMember(rs.getLong("id"), rs.getLong("team_id"), rs.getLong("employee_id"),
        rs.getString("employee_name"), rs.getString("department_name"), rs.getString("designation"),
        rs.getString("team_role"), rs.getBigDecimal("allocation_percent"),
        rs.getObject("effective_from", java.time.LocalDate.class), rs.getObject("effective_to", java.time.LocalDate.class),
        nullableLong(rs, "temporary_cover_employee_id"), rs.getString("temporary_cover_name"),
        rs.getString("delegation_note"), rs.getBoolean("active"), rs.getTimestamp("created_at").toLocalDateTime());
  }

  private String blank(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private void setLong(java.sql.PreparedStatement ps, int index, Long value) throws SQLException {
    if (value == null) ps.setNull(index, java.sql.Types.BIGINT);
    else ps.setLong(index, value);
  }
}
