package com.zahid.cinenight.features.users.web;

import com.zahid.cinenight.common.api.ApiResponse;
import com.zahid.cinenight.features.users.dto.AuthDtos.*;
import com.zahid.cinenight.features.users.service.AuthService;
import com.zahid.cinenight.features.users.service.GuestIdentityService;
import com.zahid.cinenight.features.users.domain.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final GuestIdentityService guests;
    private final UserRepository users;

    public AuthController(AuthService auth, GuestIdentityService guests, UserRepository users) {
        this.auth = auth;
        this.guests = guests;
        this.users = users;
    }

    @PostMapping("/register")
    public ApiResponse<UserDto> register(@RequestBody @Valid RegisterRequest req) {
        return ApiResponse.ok(auth.register(req));
    }

    @PostMapping("/login")
    public ApiResponse<UserDto> login(@RequestBody @Valid LoginRequest req,
                                      HttpServletRequest request,
                                      HttpServletResponse response) {
        return ApiResponse.ok(auth.login(req, request, response));
    }

    @PostMapping("/logout")
    public ApiResponse<String> logout(HttpServletRequest request, HttpServletResponse response) {
        auth.logout(request);
        guests.pauseAutomaticResume(request, response);
        return ApiResponse.ok("ok");
    }

    @PostMapping("/forgot")
    public ApiResponse<String> forgot(@RequestBody @Valid ForgotPasswordRequest req) {
        auth.forgot(req);
        return ApiResponse.ok("sent");
    }

    @PostMapping("/reset")
    public ApiResponse<String> reset(@RequestBody @Valid ResetPasswordRequest req) {
        auth.reset(req);
        return ApiResponse.ok("password-updated");
    }

    @GetMapping("/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal UserDetails principal,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        if (principal == null) return ApiResponse.ok(guests.resume(request, response));
        return ApiResponse.ok(auth.me(principal.getUsername()));
    }

    @PostMapping("/guest")
    public ApiResponse<GuestSessionDto> registerGuest(@RequestBody @Valid GuestRegisterRequest req,
                                                       HttpServletRequest request,
                                                       HttpServletResponse response) {
        return ApiResponse.ok(guests.register(req, request, response));
    }

    @PostMapping("/guest/login")
    public ApiResponse<GuestSessionDto> loginGuest(@RequestBody @Valid GuestLoginRequest req,
                                                    HttpServletRequest request,
                                                    HttpServletResponse response) {
        return ApiResponse.ok(guests.login(req, request, response));
    }

    @PostMapping("/guest/code")
    public ApiResponse<String> regenerateGuestCode(@AuthenticationPrincipal UserDetails principal) {
        if (principal == null) throw new IllegalArgumentException("Login required.");
        var user = users.findByEmail(principal.getUsername()).orElseThrow();
        return ApiResponse.ok(guests.regenerateCode(user));
    }

    @PostMapping("/verify")
    public ApiResponse<String> verify(@RequestParam String token) {
        auth.verifyEmail(token);
        return ApiResponse.ok("verified");
    }
}
