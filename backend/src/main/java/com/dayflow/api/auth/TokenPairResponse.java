package com.dayflow.api.auth;

public record TokenPairResponse(String accessToken, String refreshToken, String tokenType, int expiresInSeconds, UserView user) {
}
