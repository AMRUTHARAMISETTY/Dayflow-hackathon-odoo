package com.dayflow.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TeamProjectTaskTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void hrCanCreateTeamProjectTaskAndReadWorkload() throws Exception {
    String hrToken = login("hradmin@dayflow.test");
    long managerId = employeeIdByEmail("manager@dayflow.test");
    long employeeId = employeeIdByEmail("employee@dayflow.test");

    String teamBody = mvc.perform(post("/api/teams").header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"QA Automation Team\",\"code\":\"TEAM-QA-AUTO\",\"type\":\"Cross-functional\",\"leadEmployeeId\":"
                + managerId + ",\"capacityHoursPerWeek\":80}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.code").value("TEAM-QA-AUTO"))
        .andReturn().getResponse().getContentAsString();
    long teamId = json.readTree(teamBody).path("data").path("id").asLong();

    mvc.perform(post("/api/teams/" + teamId + "/members").header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"members\":[{\"employeeId\":" + employeeId + ",\"teamRole\":\"Member\",\"allocationPercent\":75}]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].employeeId").value(employeeId));

    String projectBody = mvc.perform(post("/api/projects").header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Quality Automation\",\"code\":\"PRJ-QA-AUTO\",\"sponsorEmployeeId\":" + managerId
                + ",\"ownerEmployeeId\":" + managerId + ",\"teamIds\":[" + teamId + "]}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.teamCount").value(1))
        .andReturn().getResponse().getContentAsString();
    long projectId = json.readTree(projectBody).path("data").path("id").asLong();

    mvc.perform(post("/api/tasks").header("Authorization", "Bearer " + hrToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":" + projectId + ",\"teamId\":" + teamId
                + ",\"title\":\"Build leave regression suite\",\"estimatedHours\":12,\"assigneeEmployeeIds\":[" + employeeId + "]}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.assigneeCount").value(1));

    mvc.perform(get("/api/workload?teamId=" + teamId).header("Authorization", "Bearer " + hrToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].employeeId").value(employeeId))
        .andExpect(jsonPath("$.data[0].assignedOpenHours").value(12.0));
  }

  @Test
  void employeeCanReadButCannotCreateTasks() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    mvc.perform(get("/api/tasks").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk());
    mvc.perform(post("/api/tasks").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"projectId\":1,\"title\":\"Self assigned admin task\"}"))
        .andExpect(status().isForbidden());
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
