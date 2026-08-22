package com.dayflow.api.shift;

import java.time.LocalTime;

public record Shift(long id, String name, LocalTime startTime, LocalTime endTime, int graceMinutes, int breakMinutes) {
}
