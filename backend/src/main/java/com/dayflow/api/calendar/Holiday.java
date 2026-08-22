package com.dayflow.api.calendar;

import java.time.LocalDate;

public record Holiday(long id, LocalDate holidayDate, String name, String location) {
}
