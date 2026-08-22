package com.dayflow.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DayflowAuthApplication {
  public static void main(String[] args) { SpringApplication.run(DayflowAuthApplication.class, args); }
}
