package com.dayflow.api.auth;

import java.util.Set;

public record UserView(long id, long employeeId, String employeeCode, String name, String email, String role,
    String departmentName, String designation, Set<String> permissions) {
}
