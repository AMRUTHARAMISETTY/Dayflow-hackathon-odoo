package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * Covers the Phase 4 payroll cycle (spec section 9): maker-checker on approval (the calculator
 * cannot approve their own run), blocking anomalies actually blocking publication, and an
 * employee only ever seeing their own slip once it's published — never before, never anyone
 * else's. Builds its own Payroll Officer accounts via the invitation flow rather than depending
 * on named seed fixtures, so it stays correct regardless of what the demo roster looks like.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PayrollTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void employeeCannotCreateOrManagePayrollRuns() throws Exception {
    String token = login("employee@dayflow.test");
    mvc.perform(post("/api/payroll/runs").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content("{\"periodMonth\":\"2031-02\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/payroll/runs").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Test
  void makerCheckerBlocksSelfApprovalAndBlockingAnomaliesBlockPublishUntilResolved() throws Exception {
    String adminToken = login("admin@dayflow.test");
    String payrollOfficerA = inviteAndAccept(adminToken, "payroll-a@example.com", "PAYROLL_OFFICER");
    String payrollOfficerB = inviteAndAccept(adminToken, "payroll-b@example.com", "PAYROLL_OFFICER");

    // A fresh, fully-verified employee with a salary structure — one guaranteed-clean line.
    String employeeToken = registerEmployee("payroll-subject@example.com");
    long employeeId = jdbc.queryForObject("select employee_id from users where email = 'payroll-subject@example.com'", Long.class);
    mvc.perform(put("/api/employees/" + employeeId + "/salary/verification").header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"bankVerified\":true,\"taxIdVerified\":true}"))
        .andExpect(status().isOk());
    mvc.perform(post("/api/employees/" + employeeId + "/salary/structures").header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"effectiveFrom\":\"" + LocalDate.now().minusDays(1) + "\",\"basicMonthly\":50000,\"hraMonthly\":10000,"
                + "\"allowancesMonthly\":5000,\"recurringDeductionsMonthly\":0,\"reason\":\"Initial structure for test\"}"))
        .andExpect(status().isOk());
    // Employee must be Active for payroll to pick them up; registration leaves them "Pending Profile".
    jdbc.update("update employees set status = 'Active' where id = ?", employeeId);

    String period = "2031-0" + (1 + (int) (Math.random() * 8)); // unlikely to collide across test runs
    String createBody = mvc.perform(post("/api/payroll/runs").header("Authorization", "Bearer " + payrollOfficerA)
            .contentType(MediaType.APPLICATION_JSON).content("{\"periodMonth\":\"" + period + "\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    long runId = json.readTree(createBody).path("data").path("id").asLong();

    mvc.perform(post("/api/payroll/runs/" + runId + "/calculate").header("Authorization", "Bearer " + payrollOfficerA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("CALCULATED"));

    mvc.perform(post("/api/payroll/runs/" + runId + "/submit-for-review").header("Authorization", "Bearer " + payrollOfficerA))
        .andExpect(status().isOk());

    // The person who calculated it cannot also approve it.
    mvc.perform(post("/api/payroll/runs/" + runId + "/approve").header("Authorization", "Bearer " + payrollOfficerA)
            .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"self-approve attempt\"}"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/payroll/runs/" + runId + "/approve").header("Authorization", "Bearer " + payrollOfficerB)
            .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Reviewed, looks correct\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("APPROVED"));

    // Publish is blocked while the rest of the org's employees still have open blocking anomalies
    // (missing bank/tax verification is the default for every seeded/other employee).
    mvc.perform(post("/api/payroll/runs/" + runId + "/publish").header("Authorization", "Bearer " + payrollOfficerB))
        .andExpect(status().isConflict());

    // Employee cannot see a slip yet — nothing has published.
    mvc.perform(get("/api/payroll/my-slips").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray())
        .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(0)));

    // Resolve every open blocking anomaly, then publish should succeed.
    String anomaliesBody = mvc.perform(get("/api/payroll/runs/" + runId + "/anomalies").header("Authorization", "Bearer " + payrollOfficerB))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    for (JsonNode anomaly : json.readTree(anomaliesBody).path("data")) {
      if (anomaly.path("blocking").asBoolean() && "OPEN".equals(anomaly.path("reviewStatus").asText())) {
        long anomalyId = anomaly.path("id").asLong();
        mvc.perform(post("/api/payroll/anomalies/" + anomalyId + "/resolve").header("Authorization", "Bearer " + payrollOfficerB)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ACKNOWLEDGED\",\"resolutionNote\":\"Reviewed for test\"}"))
            .andExpect(status().isOk());
      }
    }

    mvc.perform(post("/api/payroll/runs/" + runId + "/publish").header("Authorization", "Bearer " + payrollOfficerB))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("PUBLISHED"));

    String slipsBody = mvc.perform(get("/api/payroll/my-slips").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    JsonNode slips = json.readTree(slipsBody).path("data");
    assertThat(slips).hasSize(1);
    assertThat(slips.get(0).path("netPay").asDouble()).isGreaterThan(0);

    // Another employee cannot see this person's slip.
    long otherEmployeeId = jdbc.queryForObject("select employee_id from users where email = 'manager@dayflow.test'", Long.class);
    if (otherEmployeeId != employeeId) {
      String managerToken = login("manager@dayflow.test");
      mvc.perform(get("/api/payroll/employees/" + employeeId + "/slips").header("Authorization", "Bearer " + managerToken))
          .andExpect(status().isForbidden());
    }
  }

  private String login(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"Dayflow@123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(body).path("data").path("accessToken").asText();
  }

  private String registerEmployee(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Payroll Subject\",\"email\":\"" + email + "\",\"password\":\"Secret123!\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(body).path("data").path("accessToken").asText();
  }

  private String inviteAndAccept(String inviterToken, String email, String roleName) throws Exception {
    String createBody = mvc.perform(post("/api/invitations").header("Authorization", "Bearer " + inviterToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"roleName\":\"" + roleName + "\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    String token = json.readTree(createBody).path("data").path("token").asText();
    String acceptBody = mvc.perform(post("/api/invitations/accept")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"" + token + "\",\"name\":\"Test " + roleName + "\",\"password\":\"Secret123!\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(acceptBody).path("data").path("accessToken").asText();
  }
}
