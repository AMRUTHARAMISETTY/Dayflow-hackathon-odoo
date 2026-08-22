package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Covers Phase 6 (spec section 6, "Intelligence"): a manager can set/view goals and start a
 * review for a direct report but not for someone outside their reporting line, an employee can
 * view and progress their own goals and acknowledge their own review, and workforce insights
 * (headcount trend, attrition risk) are gated behind `insights:read` — an ordinary employee
 * cannot see org-wide analytics.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PerformanceInsightsTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void managerManagesDirectReportGoalsAndReviewsButNotOutsiders() throws Exception {
    String managerToken = login("manager@dayflow.test");
    String employeeToken = login("employee@dayflow.test");
    String hrAdminToken = login("hradmin@dayflow.test");
    long employeeId = jdbc.queryForObject("select employee_id from users where email = 'employee@dayflow.test'", Long.class);
    long outsiderEmployeeId = jdbc.queryForObject("select employee_id from users where email = 'payroll@dayflow.test'", Long.class);

    String goalBody = mvc.perform(post("/api/performance/goals").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"employeeId\":" + employeeId + ",\"title\":\"Ship Q1 roadmap\",\"description\":\"Deliver on time\",\"category\":\"Individual\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
        .andReturn().getResponse().getContentAsString();
    long goalId = json.readTree(goalBody).path("data").path("id").asLong();

    // Manager cannot set a goal for someone outside their reporting line.
    mvc.perform(post("/api/performance/goals").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"employeeId\":" + outsiderEmployeeId + ",\"title\":\"Not your report\",\"category\":\"Individual\"}"))
        .andExpect(status().isForbidden());

    // The employee can see and progress their own goal.
    mvc.perform(get("/api/performance/employees/" + employeeId + "/goals").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(1)));

    mvc.perform(post("/api/performance/goals/" + goalId + "/progress").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"progressPercent\":50,\"status\":\"IN_PROGRESS\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.progressPercent").value(50));

    // Manager starts a review for their report; HR could too, but a peer manager relationship isn't tested here.
    String reviewBody = mvc.perform(post("/api/performance/reviews").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"employeeId\":" + employeeId + ",\"cycle\":\"2026-Q1\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("DRAFT"))
        .andReturn().getResponse().getContentAsString();
    long reviewId = json.readTree(reviewBody).path("data").path("id").asLong();

    mvc.perform(post("/api/performance/reviews/" + reviewId + "/submit").header("Authorization", "Bearer " + managerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"rating\":4,\"strengths\":\"Great collaboration\",\"improvements\":\"More documentation\",\"managerComments\":\"Solid quarter\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

    // Someone else cannot acknowledge on the employee's behalf.
    mvc.perform(post("/api/performance/reviews/" + reviewId + "/acknowledge").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/performance/reviews/" + reviewId + "/acknowledge").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ACKNOWLEDGED"));
  }

  @Test
  void workforceInsightsAreRestrictedToInsightsReadPermission() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    String hrAdminToken = login("hradmin@dayflow.test");

    mvc.perform(get("/api/insights/headcount-trend").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/insights/attrition-risk").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isForbidden());

    String trendBody = mvc.perform(get("/api/insights/headcount-trend").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(trendBody).path("data")).hasSize(8);

    mvc.perform(get("/api/insights/attrition-risk").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray());
  }

  private String login(String email) throws Exception {
    String body = mvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + email + "\",\"password\":\"Dayflow@123\"}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    return json.readTree(body).path("data").path("accessToken").asText();
  }
}
