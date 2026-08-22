package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Covers the Phase 3 automation engine (spec section 17): non-HR roles can't touch rules, a
 * dry-run reports what would happen without mutating anything or sending notifications, and a
 * real run is idempotent — the same candidate is never notified twice.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AutomationEngineTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void employeeCannotToggleOrRunAutomationRules() throws Exception {
    String token = login("employee@dayflow.test");
    long ruleId = ruleIdByCode("ATTENDANCE_MISSING_CHECKOUT");

    mvc.perform(put("/api/automation-rules/" + ruleId + "/active").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/automation-rules/" + ruleId + "/run?dryRun=true").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/automation-rules").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void missingCheckoutDryRunDoesNotNotifyOrMutateThenRealRunIsIdempotent() throws Exception {
    String hrToken = login("hradmin@dayflow.test");
    long ruleId = ruleIdByCode("ATTENDANCE_MISSING_CHECKOUT");
    long managerUserId = jdbc.queryForObject("select id from users where email = 'manager@dayflow.test'", Long.class);

    int unreadBefore = unreadCount(managerUserId);

    String dryRunBody = mvc.perform(post("/api/automation-rules/" + ruleId + "/run?dryRun=true").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("DRY_RUN"))
        .andReturn().getResponse().getContentAsString();
    int matchedInDryRun = json.readTree(dryRunBody).path("data").path("matchedCount").asInt();
    assertThat(matchedInDryRun).isGreaterThanOrEqualTo(1);
    assertThat(unreadCount(managerUserId)).isEqualTo(unreadBefore);

    String realRunBody = mvc.perform(post("/api/automation-rules/" + ruleId + "/run?dryRun=false").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SUCCESS"))
        .andReturn().getResponse().getContentAsString();
    int actioned = json.readTree(realRunBody).path("data").path("actionCount").asInt();
    assertThat(actioned).isGreaterThanOrEqualTo(1);
    assertThat(unreadCount(managerUserId)).isGreaterThan(unreadBefore);

    String secondRunBody = mvc.perform(post("/api/automation-rules/" + ruleId + "/run?dryRun=false").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(secondRunBody).path("data").path("matchedCount").asInt()).isZero();
  }

  @Test
  void leavePendingReminderNotifiesApproverOnceForAnOldRequestAndSkipsFreshOnes() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long employeeId = jdbc.queryForObject("select employee_id from users where email = 'employee@dayflow.test'", Long.class);
    long annualTypeId = jdbc.queryForObject("select id from leave_types where name = 'Annual Leave'", Long.class);

    // A fresh, genuinely multi-working-day submission (so it can't auto-approve and stays
    // PENDING) far enough in the future to avoid the seeded pending request's dates.
    String start = nextWeekday(90).toString();
    String end = nextWeekday(95).toString();
    String createBody = mvc.perform(post("/api/leave/requests").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"leaveTypeId\":" + annualTypeId + ",\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\",\"reason\":\"Old pending test\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    long requestId = json.readTree(createBody).path("data").path("id").asLong();

    // Backdate it past the reminder threshold, as if it had been sitting for two days.
    jdbc.update("update leave_requests set created_at = ? where id = ?", LocalDateTime.now().minusHours(30), requestId);

    long managerUserId = jdbc.queryForObject("select id from users where email = 'manager@dayflow.test'", Long.class);
    int unreadBefore = unreadCount(managerUserId);

    String hrToken = login("hradmin@dayflow.test");
    long reminderRuleId = ruleIdByCode("LEAVE_PENDING_REMINDER");
    mvc.perform(post("/api/automation-rules/" + reminderRuleId + "/run?dryRun=false").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk());

    assertThat(unreadCount(managerUserId)).isGreaterThan(unreadBefore);
    Boolean reminderSent = jdbc.queryForObject("select reminder_sent_at is not null from leave_requests where id = ?", Boolean.class, requestId);
    assertThat(reminderSent).isTrue();

    // Running again should not double-notify the same request.
    int afterFirstRun = unreadCount(managerUserId);
    mvc.perform(post("/api/automation-rules/" + reminderRuleId + "/run?dryRun=false").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.matchedCount").value(org.hamcrest.Matchers.lessThanOrEqualTo(0)));
    assertThat(unreadCount(managerUserId)).isEqualTo(afterFirstRun);
  }

  private String login(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"Dayflow@123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(body).path("data").path("accessToken").asText();
  }

  private long ruleIdByCode(String code) {
    return jdbc.queryForObject("select id from automation_rules where code = ?", Long.class, code);
  }

  private int unreadCount(long userId) {
    Integer count = jdbc.queryForObject("select count(*) from notifications where user_id = ? and read_at is null", Integer.class, userId);
    return count == null ? 0 : count;
  }

  private LocalDate nextWeekday(int offsetDays) {
    LocalDate date = LocalDate.now().plusDays(offsetDays);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }
}
