package com.dayflow.api.email;

/**
 * Sender-agnostic interface so a real provider (Gmail API, Microsoft Graph, a transactional
 * service) can be dropped in later without touching EmailService. No provider credentials are
 * configured in this build — {@link LocalDevEmailProvider} is the only implementation, and it
 * does not dispatch anything over the network. This is a deliberate, labeled stand-in, not a
 * hidden simulation: every send is still recorded as a real {@code email_deliveries} row.
 */
public interface EmailProvider {
  DeliveryResult send(String toAddress, String subject, String body);

  record DeliveryResult(boolean success, String errorMessage) {
    public static DeliveryResult ok() {
      return new DeliveryResult(true, null);
    }
  }
}
