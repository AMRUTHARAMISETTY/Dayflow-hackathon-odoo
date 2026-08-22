package com.dayflow.auth;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest @Testcontainers(disabledWithoutDocker=true)
class DatabaseMigrationTest {
  @Container static PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:17-alpine");
  @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("spring.datasource.url",postgres::getJdbcUrl);r.add("spring.datasource.username",postgres::getUsername);r.add("spring.datasource.password",postgres::getPassword);r.add("dayflow.jwt-secret",()->"01234567890123456789012345678901");r.add("dayflow.cookie-secure",()->false);}
  private final JdbcClient db; DatabaseMigrationTest(JdbcClient db){this.db=db;}
  @Test void createsFixedRolesAndSecurityTables(){assertThat(db.sql("SELECT code FROM roles ORDER BY code").query(String.class).list()).containsExactly("ADMIN_HR","EMPLOYEE");assertThat(db.sql("SELECT count(*) FROM user_credentials").query(Long.class).single()).isZero();}
}
