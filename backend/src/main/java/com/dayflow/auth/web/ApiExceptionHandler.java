package com.dayflow.auth.web;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(BadCredentialsException.class) ResponseEntity<Map<String,String>> credentials(BadCredentialsException e){return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("code","AUTHENTICATION_FAILED","message",e.getMessage()));}
  @ExceptionHandler({IllegalArgumentException.class,MethodArgumentNotValidException.class}) ResponseEntity<Map<String,String>> invalid(Exception e){return ResponseEntity.badRequest().body(Map.of("code","VALIDATION_FAILED","message",e.getMessage()));}
}
