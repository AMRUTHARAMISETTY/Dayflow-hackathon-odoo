package com.dayflow.api.common;

import java.util.List;

/** Server-side pagination envelope shared by every list endpoint (directory, audit log, invitations). */
public record PageResponse<T>(List<T> items, int page, int size, long total) {
}
