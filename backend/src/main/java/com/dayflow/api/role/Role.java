package com.dayflow.api.role;

import java.util.List;

public record Role(long id, String name, String description, List<String> permissions) {
}
