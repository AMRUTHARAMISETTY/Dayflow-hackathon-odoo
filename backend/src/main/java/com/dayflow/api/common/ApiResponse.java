package com.dayflow.api.common;

/** Uniform envelope for every JSON response so the frontend can branch on `ok` once. */
public record ApiResponse<T>(boolean ok, T data, String error) {
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, null);
  }

  public static <T> ApiResponse<T> error(String error) {
    return new ApiResponse<>(false, null, error);
  }
}
