package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
 * Covers Phase 5 (spec section 10-13): email send permission/dispatch, HR ticket confidentiality
 * scoping (only HR Admin — not HR Officer — can see or be assigned a confidential ticket) and
 * internal notes staying invisible to the reporting employee, policy CRUD restricted to
 * `policy:manage`, and the self-service assistant's rule-based intent routing (including its
 * escalate-to-ticket path). Uses the seeded demo accounts directly since every role this phase
 * cares about already has one.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunicationTests {
  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void employeeCannotAccessHrOnlyCommunicationEndpoints() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    mvc.perform(get("/api/email/templates").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/email/templates").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\":\"X\",\"category\":\"x\",\"name\":\"x\",\"subject\":\"x\",\"body\":\"x\"}"))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/policies").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\":\"X\",\"title\":\"x\",\"category\":\"x\",\"body\":\"x\",\"effectiveDate\":\"2026-01-01\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void hrAdminCanSendTestEmailAndSeeDelivery() throws Exception {
    String hrAdminToken = login("hradmin@dayflow.test");
    String templatesBody = mvc.perform(get("/api/email/templates").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(templatesBody).path("data")).isNotEmpty();

    String sendBody = mvc.perform(post("/api/email/messages/test").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"recipients\":{\"employeeIds\":[],\"allActive\":false},\"subject\":\"Hello {{employee_name}}\","
                + "\"body\":\"This is a test.\",\"bulkConfirmed\":false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("SENT"))
        .andReturn().getResponse().getContentAsString();
    long messageId = json.readTree(sendBody).path("data").path("id").asLong();

    mvc.perform(get("/api/email/messages/" + messageId + "/deliveries").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(1)))
        .andExpect(jsonPath("$.data[0].status").value("SENT"));
  }

  @Test
  void hrAdminCanTargetedSendWithoutBulkConfirmation() throws Exception {
    String hrAdminToken = login("hradmin@dayflow.test");
    long targetEmployeeId = jdbc.queryForObject("select employee_id from users where email = 'employee@dayflow.test'", Long.class);

    String previewBody = mvc.perform(post("/api/email/preview").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"recipients\":{\"employeeIds\":[" + targetEmployeeId + "],\"allActive\":false},"
                + "\"subject\":\"Hi {{employee_name}}\",\"body\":\"Body for {{employee_name}}\",\"bulkConfirmed\":false}"))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(previewBody).path("data").path("recipientCount").asInt()).isEqualTo(1);

    mvc.perform(post("/api/email/messages").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"recipients\":{\"employeeIds\":[" + targetEmployeeId + "],\"allActive\":false},"
                + "\"subject\":\"Hi {{employee_name}}\",\"body\":\"Body for {{employee_name}}\",\"bulkConfirmed\":false}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("SENT"));
  }

  @Test
  void ticketAssignmentReplyAndResolutionRespectConfidentialityAndInternalNotes() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    String hrAdminToken = login("hradmin@dayflow.test");
    String hrOfficerToken = login("hrofficer@dayflow.test");
    long hrAdminUserId = jdbc.queryForObject("select id from users where email = 'hradmin@dayflow.test'", Long.class);
    long hrOfficerUserId = jdbc.queryForObject("select id from users where email = 'hrofficer@dayflow.test'", Long.class);

    String createBody = mvc.perform(post("/api/tickets").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"category\":\"IT Support\",\"subject\":\"Laptop is slow\",\"description\":\"Please help.\",\"confidential\":false}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.status").value("OPEN"))
        .andExpect(jsonPath("$.data.priority").value("MEDIUM"))
        .andReturn().getResponse().getContentAsString();
    long ticketId = json.readTree(createBody).path("data").path("id").asLong();

    mvc.perform(post("/api/tickets/" + ticketId + "/assign").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"assignedToUserId\":" + hrOfficerUserId + "}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ASSIGNED"));

    mvc.perform(post("/api/tickets/" + ticketId + "/messages").header("Authorization", "Bearer " + hrOfficerToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Checking with IT team.\",\"internalNote\":true}"))
        .andExpect(status().isCreated());
    mvc.perform(post("/api/tickets/" + ticketId + "/messages").header("Authorization", "Bearer " + hrOfficerToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"We are looking into this.\",\"internalNote\":false}"))
        .andExpect(status().isCreated());

    String employeeView = mvc.perform(get("/api/tickets/" + ticketId + "/messages").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    JsonNode employeeMessages = json.readTree(employeeView).path("data");
    assertThat(employeeMessages).hasSize(1);
    assertThat(employeeMessages.get(0).path("internalNote").asBoolean()).isFalse();

    String hrView = mvc.perform(get("/api/tickets/" + ticketId + "/messages").header("Authorization", "Bearer " + hrOfficerToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(hrView).path("data")).hasSize(2);

    // Employee cannot leave an internal note.
    mvc.perform(post("/api/tickets/" + ticketId + "/messages").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"trying\",\"internalNote\":true}"))
        .andExpect(status().isForbidden());

    mvc.perform(post("/api/tickets/" + ticketId + "/status").header("Authorization", "Bearer " + hrOfficerToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RESOLVED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.resolvedAt").exists());

    mvc.perform(post("/api/tickets/" + ticketId + "/rate").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.satisfactionRating").value(5));

    // A confidential ticket: HR Officer (no ticket:confidential:read) is refused view and assignment; HR Admin can see it.
    String confidentialBody = mvc.perform(post("/api/tickets").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"category\":\"Confidential Grievance\",\"subject\":\"Private matter\","
                + "\"description\":\"Needs to stay confidential.\",\"confidential\":true}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.confidential").value(true))
        .andReturn().getResponse().getContentAsString();
    long confidentialTicketId = json.readTree(confidentialBody).path("data").path("id").asLong();

    mvc.perform(get("/api/tickets/" + confidentialTicketId).header("Authorization", "Bearer " + hrOfficerToken))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/tickets/" + confidentialTicketId).header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk());
    mvc.perform(post("/api/tickets/" + confidentialTicketId + "/assign").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"assignedToUserId\":" + hrOfficerUserId + "}"))
        .andExpect(status().isForbidden());
    mvc.perform(post("/api/tickets/" + confidentialTicketId + "/assign").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"assignedToUserId\":" + hrAdminUserId + "}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("ASSIGNED"));

    // Employee still sees their own confidential ticket even without ticket:read.
    mvc.perform(get("/api/tickets/" + confidentialTicketId).header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk());
  }

  @Test
  void policyListIsReadableByEveryoneButOnlyHrCanManage() throws Exception {
    String employeeToken = login("employee@dayflow.test");
    String hrAdminToken = login("hradmin@dayflow.test");

    String listBody = mvc.perform(get("/api/policies").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    assertThat(json.readTree(listBody).path("data")).isNotEmpty();

    String createBody = mvc.perform(post("/api/policies").header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\":\"TEST_POLICY\",\"title\":\"Test Policy\",\"category\":\"Test\","
                + "\"body\":\"Body text.\",\"effectiveDate\":\"2026-01-01\"}"))
        .andExpect(status().isCreated())
        .andReturn().getResponse().getContentAsString();
    long policyId = json.readTree(createBody).path("data").path("id").asLong();

    mvc.perform(put("/api/policies/" + policyId).header("Authorization", "Bearer " + hrAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Updated Test Policy\",\"category\":\"Test\",\"body\":\"Updated body.\","
                + "\"effectiveDate\":\"2026-01-01\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.title").value("Updated Test Policy"));

    mvc.perform(post("/api/policies/" + policyId + "/archive").header("Authorization", "Bearer " + hrAdminToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.active").value(false));

    String afterArchiveList = mvc.perform(get("/api/policies").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString();
    boolean stillListed = false;
    for (JsonNode node : json.readTree(afterArchiveList).path("data")) {
      if (node.path("id").asLong() == policyId) {
        stillListed = true;
      }
    }
    assertThat(stillListed).isFalse();
  }

  @Test
  void selfServiceAssistantRoutesIntentsAndEscalatesToATicket() throws Exception {
    String employeeToken = login("employee@dayflow.test");

    mvc.perform(post("/api/assistant/ask").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"What is the leave policy?\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.intent").value("POLICY"))
        .andExpect(jsonPath("$.data.policyId").exists());

    mvc.perform(post("/api/assistant/ask").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"How many leave days do I have left?\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.intent").value("LEAVE_BALANCE"));

    mvc.perform(post("/api/assistant/ask").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"asdkjfh qwoeiru nonsense\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.intent").value("UNKNOWN"));

    String escalateBody = mvc.perform(post("/api/assistant/escalate").header("Authorization", "Bearer " + employeeToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"question\":\"I need a human to look at my desk setup request\",\"category\":\"General Query\",\"confidential\":false}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.intent").value("ESCALATION"))
        .andReturn().getResponse().getContentAsString();
    String actionTaken = json.readTree(escalateBody).path("data").path("actionTaken").asText();
    assertThat(actionTaken).startsWith("TICKET_CREATED:");

    mvc.perform(get("/api/assistant/history").header("Authorization", "Bearer " + employeeToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(4))));

    // AUDITOR has read-only visibility over HR communication but not the assistant itself.
    String auditorToken = login("auditor@dayflow.test");
    mvc.perform(post("/api/assistant/ask").header("Authorization", "Bearer " + auditorToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"question\":\"anything\"}"))
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
}
