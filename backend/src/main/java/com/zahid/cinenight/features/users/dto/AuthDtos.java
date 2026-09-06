package com.zahid.cinenight.features.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

public class AuthDtos {
    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min=6,max=64) String password,
            @NotBlank @Size(min=2,max=100) String displayName) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record ForgotPasswordRequest(@Email @NotBlank String email) {}
    public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min=6,max=64) String newPassword) {}
    public record GuestRegisterRequest(
            @NotBlank @Size(min=3,max=24)
            @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Use only letters, numbers, and underscores.")
            String username) {}
    public record GuestLoginRequest(
            @NotBlank @Size(min=3,max=24) String username,
            @NotBlank @Size(min=8,max=12) String code) {}
    public record UserDto(Long id, String email, String displayName, String role,
                          String accountType, Instant renameAvailableAt) {}
    public record GuestSessionDto(UserDto user, String recoveryCode, boolean existingAccount) {}
}
