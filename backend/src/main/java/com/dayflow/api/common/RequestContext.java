package com.dayflow.api.common;

/** Per-request request-id and client IP, populated by {@link DayflowRequestContextFilter} and read by AuditService. */
public final class RequestContext {
  private static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();
  private static final ThreadLocal<String> CLIENT_IP = new ThreadLocal<>();

  private RequestContext() {
  }

  static void set(String requestId, String clientIp) {
    REQUEST_ID.set(requestId);
    CLIENT_IP.set(clientIp);
  }

  static void clear() {
    REQUEST_ID.remove();
    CLIENT_IP.remove();
  }

  public static String requestId() {
    return REQUEST_ID.get();
  }

  public static String clientIp() {
    return CLIENT_IP.get();
  }
}
