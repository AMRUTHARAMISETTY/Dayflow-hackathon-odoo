package com.dayflow.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
  "spring.datasource.url=jdbc:h2:mem:dayflow-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1"
})
@AutoConfigureMockMvc
class DayflowApiApplicationTests {
  @Autowired MockMvc mvc;

  @Test
  void publicRegistrationCannotCreateAdminRole() throws Exception {
    mvc.perform(post("/api/auth/register")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Bad Actor\",\"email\":\"bad@example.com\",\"password\":\"Secret123!\",\"role\":\"HR Admin\"}"))
      .andExpect(status().isBadRequest());
  }

  @Test
  void dashboardRequiresAuthentication() throws Exception {
    mvc.perform(get("/api/hr/dashboard")).andExpect(status().isForbidden());
  }

  @Test
  void adminCanReadDashboard() throws Exception {
    String response = mvc.perform(post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"admin@dayflow.test\",\"password\":\"Dayflow@123\"}"))
      .andExpect(status().isOk())
      .andReturn().getResponse().getContentAsString();
    assertThat(response).contains("dayflow-dev-");
  }
}
