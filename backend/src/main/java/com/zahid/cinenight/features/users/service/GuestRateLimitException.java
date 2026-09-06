package com.zahid.cinenight.features.users.service;

public class GuestRateLimitException extends RuntimeException {
    public GuestRateLimitException(String message) {
        super(message);
    }
}
