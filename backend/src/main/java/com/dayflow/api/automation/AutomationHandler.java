package com.dayflow.api.automation;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * A built-in, code-defined automation. Deliberately not a scripting engine — HR configures
 * thresholds and toggles active/test-mode on an existing handler rather than authoring arbitrary
 * logic, which keeps "no-code automation" from becoming an arbitrary-code-execution surface.
 * Every handler must honor {@code dryRun}: report what would happen without notifying anyone or
 * mutating state (spec section 17.3's "dry-run mode that performs no data changes").
 */
public interface AutomationHandler {
  /** Must match an automation_rules.code value. */
  String code();

  HandlerResult run(JsonNode config, boolean dryRun);

  record HandlerResult(int matchedCount, int actionCount, String detail) {
  }
}
