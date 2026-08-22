package com.dayflow.api.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(1)
public class DayflowRequestContextFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String requestId = UUID.randomUUID().toString();
    String forwardedFor = request.getHeader("X-Forwarded-For");
    String clientIp = (forwardedFor != null && !forwardedFor.isBlank())
        ? forwardedFor.split(",")[0].trim()
        : request.getRemoteAddr();
    RequestContext.set(requestId, clientIp);
    response.setHeader("X-Request-Id", requestId);
    try {
      chain.doFilter(request, response);
    } finally {
      RequestContext.clear();
    }
  }
}
