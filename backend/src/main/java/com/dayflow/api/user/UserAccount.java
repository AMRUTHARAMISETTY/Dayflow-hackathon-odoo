package com.dayflow.api.user;

import java.util.Set;

/** A login credential row, always linked 1:1 to an {@code employees} record. */
public record UserAccount(long id, long employeeId, String employeeName, String email, String passwordHash,
    long roleId, String roleName, boolean active, Set<String> permissions) {
}
