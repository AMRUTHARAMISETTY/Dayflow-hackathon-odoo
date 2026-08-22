package com.dayflow.api.security;

import java.util.Set;

/** Authenticated principal resolved from the JWT access token and attached to the security context. */
public record CurrentUser(long userId, long employeeId, String name, String email, String role, Set<String> permissions) {
  public boolean has(String permission) {
    return permissions.contains(permission);
  }

  public void require(String permission) {
    if (!has(permission)) {
      throw com.dayflow.api.common.ApiException.forbidden("You do not have permission to perform this action.");
    }
  }
}
