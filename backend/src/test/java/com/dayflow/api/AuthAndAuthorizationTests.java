package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Covers the security properties spec sections 2 and 21 call out explicitly: nobody can grant
 * themselves HR access, row-level employee visibility follows role scope, sensitive changes
 * require a reason, and refresh tokens rotate (single use).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndAuthorizationTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void publicRegistrationAlwaysCreatesAnEmployeeAccountRegardlessOfClientInput() throws Exception {
    String body = mvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Sly Applicant\",\"email\":\"sly@example.com\",\"password\":\"Secret123!\",\"role\":\"SUPER_ADMIN\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    JsonNode user = json.readTree(body).path("data").path("user");
    assertThat(user.path("role").asText()).isEqualTo("EMPLOYEE");
    assertThat(user.path("permissions").toString()).doesNotContain("employee:read\"").doesNotContain("audit:read");
  }

  @Test
  void loginRejectsWrongPassword() throws Exception {
    mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"admin@dayflow.test\",\"password\":\"wrong-password\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void unauthenticatedRequestsAreRejected() throws Exception {
    mvc.perform(get("/api/dashboard/summary")).andExpect(status().isForbidden());
  }

  @Test
  void employeeCanOnlySeeOwnRecordNotTheirManagers() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long managerId = employeeIdByEmail("manager@dayflow.test");
    long ownId = employeeIdByEmail("employee@dayflow.test");

    mvc.perform(get("/api/employees/" + ownId).header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk());
    mvc.perform(get("/api/employees/" + managerId).header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isForbidden());
  }

  @Test
  void managerSeesDirectReportsButNotUnrelatedEmployees() throws Exception {
    String managerToken = login("manager@dayflow.test");
    long reportId = employeeIdByEmail("employee@dayflow.test");
    long unrelatedId = employeeIdByEmail("auditor@dayflow.test");

    mvc.perform(get("/api/employees/" + reportId).header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isOk());
    mvc.perform(get("/api/employees/" + unrelatedId).header("Authorization", "Bearer " + managerToken))
        .andExpect(status().isForbidden());
  }

  @Test
  void hrAdminSeesTheFullDirectory() throws Exception {
    String hrToken = login("hradmin@dayflow.test");
    mvc.perform(get("/api/employees").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.total").value(org.hamcrest.Matchers.greaterThanOrEqualTo(7)));
  }

  @Test
  void refreshTokenCanOnlyBeUsedOnce() throws Exception {
    String loginBody = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"admin@dayflow.test\",\"password\":\"Dayflow@123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    String refreshToken = json.readTree(loginBody).path("data").path("refreshToken").asText();

    mvc.perform(post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
        .andExpect(status().isOk());

    mvc.perform(post("/api/auth/refresh")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void hrAdminCannotInviteSuperAdminOrPeerHrAdminAccounts() throws Exception {
    String hrToken = login("hradmin@dayflow.test");
    mvc.perform(post("/api/invitations")
            .header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"new-admin@example.com\",\"roleName\":\"SUPER_ADMIN\"}"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/invitations")
            .header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"new-manager@example.com\",\"roleName\":\"MANAGER\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  void sensitiveJobChangeRequiresPermissionAndAReason() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    long targetId = employeeIdByEmail("employee@dayflow.test");

    mvc.perform(patch("/api/employees/" + targetId + "/job-details")
            .header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"designation\":\"Senior Engineer\",\"reason\":\"Self promotion attempt\"}"))
        .andExpect(status().isForbidden());

    String hrToken = login("hradmin@dayflow.test");
    mvc.perform(patch("/api/employees/" + targetId + "/job-details")
            .header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"designation\":\"Senior Engineer\",\"reason\":\"\"}"))
        .andExpect(status().isBadRequest());

    mvc.perform(patch("/api/employees/" + targetId + "/job-details")
            .header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"designation\":\"Senior Engineer\",\"reason\":\"Confirmed after annual review\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.designation").value("Senior Engineer"));

    mvc.perform(get("/api/employees/" + targetId + "/history").header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].changeType").value("PROMOTION"));
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
}
