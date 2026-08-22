package com.dayflow.api.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Local development adapter: logs the send and reports success, without contacting any real
 * mail server. Swap for a real {@link EmailProvider} implementation (Gmail API, Microsoft Graph,
 * a transactional provider) once credentials are available — nothing else in EmailService needs
 * to change. */
@Component
class LocalDevEmailProvider implements EmailProvider {
  private static final Logger log = LoggerFactory.getLogger(LocalDevEmailProvider.class);

  @Override
  public DeliveryResult send(String toAddress, String subject, String body) {
    log.info("[dev email adapter] would send to {} — subject: {}", toAddress, subject);
    return DeliveryResult.ok();
  }
}
