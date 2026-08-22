package com.dayflow.api.calendar;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/** Weekend (Sat/Sun) and holiday-aware day counting, shared by attendance and leave. */
@Component
public class WorkingDayCalculator {
  private final HolidayRepository holidayRepository;

  public WorkingDayCalculator(HolidayRepository holidayRepository) {
    this.holidayRepository = holidayRepository;
  }

  public boolean isWeekend(LocalDate date) {
    return date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
  }

  public Set<LocalDate> holidaysBetween(LocalDate from, LocalDate to) {
    List<Holiday> holidays = holidayRepository.findBetween(from, to);
    return holidays.stream().map(Holiday::holidayDate).collect(Collectors.toSet());
  }

  public boolean isWorkingDay(LocalDate date, Set<LocalDate> holidays) {
    return !isWeekend(date) && !holidays.contains(date);
  }

  /** Inclusive working-day count between start and end, excluding weekends and holidays. */
  public double countWorkingDays(LocalDate start, LocalDate end) {
    Set<LocalDate> holidays = holidaysBetween(start, end);
    double count = 0;
    for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
      if (isWorkingDay(date, holidays)) {
        count += 1;
      }
    }
    return count;
  }
}
