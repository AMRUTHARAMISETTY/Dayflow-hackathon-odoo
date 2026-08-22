package com.dayflow.api.employee;

import com.dayflow.api.common.ApiException;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class EmployeeRepository {
  private static final String BASE_SELECT = """
      select e.id, e.employee_code, e.name, e.email, e.phone, e.department_id, d.name department_name,
             e.designation, e.manager_id, m.name manager_name, e.location, e.employment_type, e.status,
             e.joining_date, e.created_at, e.updated_at,
             exists(select 1 from users u where u.employee_id = e.id) has_login_account,
             e.bank_verified, e.tax_id_verified
      from employees e
      left join departments d on d.id = e.department_id
      left join employees m on m.id = e.manager_id
      """;

  private final JdbcTemplate jdbc;

  public EmployeeRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record SearchFilters(String q, Long departmentId, String status, String employmentType, String location,
      Long managerId, String sort, String direction) {
  }

  public com.dayflow.api.common.PageResponse<Employee> search(SearchFilters filters, Long restrictToEmployeeId,
      Long restrictToManagerId, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (filters.q() != null && !filters.q().isBlank()) {
      where.append(" and (lower(e.name) like ? or lower(e.email) like ? or lower(coalesce(e.employee_code,'')) like ?) ");
      String like = "%" + filters.q().toLowerCase() + "%";
      args.add(like);
      args.add(like);
      args.add(like);
    }
    if (filters.departmentId() != null) {
      where.append(" and e.department_id = ? ");
      args.add(filters.departmentId());
    }
    if (filters.status() != null && !filters.status().isBlank()) {
      where.append(" and e.status = ? ");
      args.add(filters.status());
    }
    if (filters.employmentType() != null && !filters.employmentType().isBlank()) {
      where.append(" and e.employment_type = ? ");
      args.add(filters.employmentType());
    }
    if (filters.location() != null && !filters.location().isBlank()) {
      where.append(" and e.location = ? ");
      args.add(filters.location());
    }
    if (filters.managerId() != null) {
      where.append(" and e.manager_id = ? ");
      args.add(filters.managerId());
    }
    if (restrictToEmployeeId != null && restrictToManagerId != null) {
      where.append(" and (e.id = ? or e.manager_id = ?) ");
      args.add(restrictToEmployeeId);
      args.add(restrictToManagerId);
    } else if (restrictToEmployeeId != null) {
      where.append(" and e.id = ? ");
      args.add(restrictToEmployeeId);
    }

    String sortColumn = switch (filters.sort() == null ? "name" : filters.sort()) {
      case "joiningDate" -> "e.joining_date";
      case "department" -> "d.name";
      case "status" -> "e.status";
      default -> "e.name";
    };
    String direction = "desc".equalsIgnoreCase(filters.direction()) ? "desc" : "asc";

    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<Employee> items = jdbc.query(
        BASE_SELECT + where + " order by " + sortColumn + " " + direction + " limit ? offset ? ",
        this::map, pagedArgs.toArray());

    long total = jdbc.queryForObject("select count(*) from employees e " + where, Long.class, args.toArray());
    return new com.dayflow.api.common.PageResponse<>(items, page, size, total);
  }

  public Optional<Employee> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(BASE_SELECT + " where e.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  /** Unpaginated active-employee lookup used by attendance/leave resolution, which needs the
   * whole in-scope roster for a single day rather than a page of results. */
  public List<Employee> findActive(Long departmentId, Long restrictToEmployeeId, Long restrictToManagerId) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where e.status = 'Active' ");
    if (departmentId != null) {
      where.append(" and e.department_id = ? ");
      args.add(departmentId);
    }
    if (restrictToEmployeeId != null && restrictToManagerId != null) {
      where.append(" and (e.id = ? or e.manager_id = ?) ");
      args.add(restrictToEmployeeId);
      args.add(restrictToManagerId);
    } else if (restrictToEmployeeId != null) {
      where.append(" and e.id = ? ");
      args.add(restrictToEmployeeId);
    }
    return jdbc.query(BASE_SELECT + where + " order by e.name", this::map, args.toArray());
  }

  public boolean existsByEmail(String email) {
    Integer count = jdbc.queryForObject("select count(*) from employees where lower(email) = lower(?)", Integer.class, email);
    return count != null && count > 0;
  }

  public long create(String name, String email, String phone, Long departmentId, String designation,
      Long managerId, String location, String employmentType, String status, LocalDate joiningDate) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into employees(name, email, phone, department_id, designation, manager_id, location,
                                 employment_type, status, joining_date)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setString(1, name);
      ps.setString(2, email);
      ps.setString(3, phone);
      setNullableLong(ps, 4, departmentId);
      ps.setString(5, designation);
      setNullableLong(ps, 6, managerId);
      ps.setString(7, location);
      ps.setString(8, employmentType);
      ps.setString(9, status);
      if (joiningDate != null) {
        ps.setDate(10, Date.valueOf(joiningDate));
      } else {
        ps.setNull(10, java.sql.Types.DATE);
      }
      return ps;
    }, keys);
    long id = keys.getKey().longValue();
    String employeeCode = "DF-" + String.format("%05d", id);
    jdbc.update("update employees set employee_code = ? where id = ?", employeeCode, id);
    return id;
  }

  public void updateBasicFields(long id, String phone, String designation, String location) {
    jdbc.update("update employees set phone = ?, designation = ?, location = ?, updated_at = current_timestamp where id = ?",
        phone, designation, location, id);
  }

  public void applySensitiveChange(long id, Long departmentId, Long managerId, String employmentType, String status) {
    jdbc.update("""
        update employees set department_id = ?, manager_id = ?, employment_type = ?, status = ?, updated_at = current_timestamp
        where id = ?
        """, departmentId, managerId, employmentType, status, id);
  }

  public List<Employee> orgChart() {
    return jdbc.query(BASE_SELECT + " order by e.manager_id nulls first, e.name", this::map);
  }

  public void insertJobHistory(long employeeId, Long departmentId, String designation, Long managerId,
      String employmentType, String status, LocalDate effectiveDate, String changeType, String reason,
      Long changedByUserId) {
    jdbc.update("""
        insert into employee_job_history(employee_id, department_id, designation, manager_id, employment_type,
                                          status, effective_date, change_type, reason, changed_by_user_id)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, employeeId, departmentId, designation, managerId, employmentType, status,
        Date.valueOf(effectiveDate), changeType, reason, changedByUserId);
  }

  public List<EmployeeJobHistoryEntry> history(long employeeId) {
    return jdbc.query("""
        select h.id, h.department_id, d.name department_name, h.designation, h.manager_id, m.name manager_name,
               h.employment_type, h.status, h.effective_date, h.change_type, h.reason, coalesce(ce.name, 'System') changed_by_name,
               h.created_at
        from employee_job_history h
        left join departments d on d.id = h.department_id
        left join employees m on m.id = h.manager_id
        left join users u on u.id = h.changed_by_user_id
        left join employees ce on ce.id = u.employee_id
        where h.employee_id = ?
        order by h.created_at desc
        """, (rs, rowNum) -> new EmployeeJobHistoryEntry(
        rs.getLong("id"),
        (Long) rs.getObject("department_id"),
        rs.getString("department_name"),
        rs.getString("designation"),
        (Long) rs.getObject("manager_id"),
        rs.getString("manager_name"),
        rs.getString("employment_type"),
        rs.getString("status"),
        rs.getDate("effective_date").toLocalDate(),
        rs.getString("change_type"),
        rs.getString("reason"),
        rs.getString("changed_by_name"),
        rs.getTimestamp("created_at").toLocalDateTime()), employeeId);
  }

  public int countByStatus(String status) {
    Integer count = jdbc.queryForObject("select count(*) from employees where status = ?", Integer.class, status);
    return count == null ? 0 : count;
  }

  public int countActiveAsOf(LocalDate asOfDate) {
    Integer count = jdbc.queryForObject(
        "select count(*) from employees where status = 'Active' and joining_date <= ?", Integer.class, Date.valueOf(asOfDate));
    return count == null ? 0 : count;
  }

  public List<Employee> findNeedsOnboardingFollowUp(int limit) {
    return jdbc.query(
        BASE_SELECT + " where e.status in ('Onboarding','Pending Profile') order by e.created_at asc limit ?",
        this::map, limit);
  }

  public List<Object[]> departmentBreakdown() {
    return jdbc.query("""
        select d.name, count(e.id)
        from departments d left join employees e on e.department_id = d.id and e.status = 'Active'
        group by d.name order by d.name
        """, (rs, rowNum) -> new Object[] {rs.getString(1), rs.getLong(2)});
  }

  private void setNullableLong(java.sql.PreparedStatement ps, int index, Long value) throws SQLException {
    if (value != null) {
      ps.setLong(index, value);
    } else {
      ps.setNull(index, java.sql.Types.BIGINT);
    }
  }

  private Employee map(ResultSet rs, int rowNum) throws SQLException {
    Date joiningDate = rs.getDate("joining_date");
    Timestamp createdAt = rs.getTimestamp("created_at");
    Timestamp updatedAt = rs.getTimestamp("updated_at");
    return new Employee(
        rs.getLong("id"),
        rs.getString("employee_code"),
        rs.getString("name"),
        rs.getString("email"),
        rs.getString("phone"),
        (Long) rs.getObject("department_id"),
        rs.getString("department_name"),
        rs.getString("designation"),
        (Long) rs.getObject("manager_id"),
        rs.getString("manager_name"),
        rs.getString("location"),
        rs.getString("employment_type"),
        rs.getString("status"),
        joiningDate == null ? null : joiningDate.toLocalDate(),
        createdAt == null ? null : createdAt.toLocalDateTime(),
        updatedAt == null ? null : updatedAt.toLocalDateTime(),
        rs.getBoolean("has_login_account"),
        rs.getBoolean("bank_verified"),
        rs.getBoolean("tax_id_verified"));
  }

  public void setPayrollVerificationFlags(long id, boolean bankVerified, boolean taxIdVerified) {
    jdbc.update("update employees set bank_verified = ?, tax_id_verified = ? where id = ?", bankVerified, taxIdVerified, id);
  }

  public Employee requireById(long id) {
    return findById(id).orElseThrow(() -> ApiException.notFound("Employee not found"));
  }
}
