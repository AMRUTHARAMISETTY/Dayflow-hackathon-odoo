package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Covers the Phase 2 workflows spec sections 7 and 8 call out: a day-based check-in/out cycle,
 * row-level attendance/leave visibility matching the employee-directory scoping rules, the
 * "Smart Approval" single-day auto-approve rule, manager/HR approval routing, and the
 * attendance-correction round trip actually mutating the underlying record.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttendanceLeaveTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void checkInThenCheckOutSucceedsButCannotRepeat() throws Exception {
    String token = login("auditor@dayflow.test");

    mvc.perform(post("/api/attendance/check-in").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("Present"));

    mvc.perform(post("/api/attendance/check-in").header("Authorization", "Bearer " + token))
        .andExpect(status().isConflict());

    mvc.perform(post("/api/attendance/check-out").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.checkOut").isNotEmpty());

    mvc.perform(post("/api/attendance/check-out").header("Authorization", "Bearer " + token))
        .andExpect(status().isConflict());
  }

  @Test
  void employeeCannotViewAnotherEmployeesAttendance() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long nishaId = employeeIdByEmail("auditor@dayflow.test");

    mvc.perform(get("/api/attendance/employees/" + nishaId + "?from=2026-01-01&to=2026-01-07")
            .header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isForbidden());
  }

  @Test
  void managerSeesDirectReportAttendanceButNotUnrelatedEmployee() throws Exception {
    String managerToken = login("manager@dayflow.test");
    long devId = employeeIdByEmail("employee@dayflow.test");
    long nishaId = employeeIdByEmail("auditor@dayflow.test");
    String from = LocalDate.now().minusDays(7).toString();
    String to = LocalDate.now().toString();

    mvc.perform(get("/api/attendance/employees/" + devId + "?from=" + from + "&to=" + to)
            .header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isOk());
    mvc.perform(get("/api/attendance/employees/" + nishaId + "?from=" + from + "&to=" + to)
            .header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isForbidden());
  }

  @Test
  void singleDayLeaveWithSufficientBalanceAutoApproves() throws Exception {
    String token = login("auditor@dayflow.test");
    long sickTypeId = leaveTypeId(token, "Sick Leave");
    java.math.BigDecimal before = sickBalance(token, sickTypeId);
    String day = nextWeekday(45).toString();

    String body = mvc.perform(post("/api/leave/requests").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"leaveTypeId\":" + sickTypeId + ",\"startDate\":\"" + day + "\",\"endDate\":\"" + day + "\",\"reason\":\"Clinic visit\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("APPROVED"))
        .andExpect(jsonPath("$.data.autoApproved").value(true))
        .andReturn().getResponse().getContentAsString();
    assertThat(body).contains("\"autoApproved\":true");

    java.math.BigDecimal after = sickBalance(token, sickTypeId);
    assertThat(after).isEqualByComparingTo(before.subtract(java.math.BigDecimal.ONE));
  }

  @Test
  void multiDayLeaveRoutesToManagerAndManagerCanApprove() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long employeeUserId = jdbc.queryForObject("select id from users where email = ?", Long.class, "employee@dayflow.test");
    long annualTypeId = leaveTypeId(employeeToken, "Annual Leave");
    String start = nextWeekday(60).toString();
    String end = nextWeekday(61).toString();

    String createBody = mvc.perform(post("/api/leave/requests").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"leaveTypeId\":" + annualTypeId + ",\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\",\"reason\":\"Trip\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("PENDING"))
        .andReturn().getResponse().getContentAsString();
    long requestId = json.readTree(createBody).path("data").path("id").asLong();

    String managerToken = login("manager@dayflow.test");
    mvc.perform(get("/api/notifications/unread-count").header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.count").value(org.hamcrest.Matchers.greaterThan(0)));

    // An employee without leave:approve cannot decide it.
    mvc.perform(post("/api/leave/requests/" + requestId + "/decide").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true,\"reason\":\"self-approve attempt\"}"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/leave/requests/" + requestId + "/decide").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true,\"reason\":\"Approved, coverage arranged\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));
  }

  @Test
  void attendanceCorrectionRoundTripUpdatesTheRecord() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long devId = employeeIdByEmail("employee@dayflow.test");
    LocalDate workDate = nextWeekday(-90);

    String createBody = mvc.perform(post("/api/attendance/corrections").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"workDate\":\"" + workDate + "\",\"requestedCheckIn\":\"" + workDate + "T09:00:00\",\"requestedCheckOut\":\""
                + workDate + "T18:00:00\",\"reason\":\"Forgot to check out\",\"evidenceNote\":\"Badge log attached\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("PENDING"))
        .andReturn().getResponse().getContentAsString();
    long correctionId = json.readTree(createBody).path("data").path("id").asLong();

    String managerToken = login("manager@dayflow.test");
    mvc.perform(get("/api/attendance/corrections?status=PENDING").header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.total").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));

    mvc.perform(post("/api/attendance/corrections/" + correctionId + "/decide").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true,\"reason\":\"Verified with badge log\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));

    mvc.perform(get("/api/attendance/employees/" + devId + "?from=" + workDate + "&to=" + workDate)
            .header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].status").value("Present"))
        .andExpect(jsonPath("$.data[0].checkIn").isNotEmpty());
  }

  private String login(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"Dayflow@123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(body).path("data").path("accessToken").asText();
  }

  private long employeeIdByEmail(String email) {
    return jdbc.queryForObject("select id from employees where email = ?", Long.class, email);
  }

  private long leaveTypeId(String token, String name) throws Exception {
    String body = mvc.perform(get("/api/leave/types").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    JsonNode types = json.readTree(body).path("data");
    for (JsonNode type : types) {
      if (type.path("name").asText().equals(name)) {
        return type.path("id").asLong();
      }
    }
    throw new IllegalStateException("Leave type not found: " + name);
  }

  private java.math.BigDecimal sickBalance(String token, long sickTypeId) throws Exception {
    long employeeId = jdbc.queryForObject(
        "select employee_id from users where email = 'auditor@dayflow.test'", Long.class);
    String body = mvc.perform(get("/api/leave/employees/" + employeeId + "/balances").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    JsonNode balances = json.readTree(body).path("data");
    for (JsonNode balance : balances) {
      if (balance.path("leaveTypeId").asLong() == sickTypeId) {
        return new java.math.BigDecimal(balance.path("balance").asText());
      }
    }
    throw new IllegalStateException("Sick leave balance not found");
  }

  private LocalDate nextWeekday(int offsetDays) {
    LocalDate date = LocalDate.now().plusDays(offsetDays);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }
}
