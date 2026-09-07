package com.zahid.cinenight.features.users.web;

import com.zahid.cinenight.common.api.ApiResponse;
import com.zahid.cinenight.features.users.service.AdminUserService;
import com.zahid.cinenight.features.users.service.AdminUserService.AdminUserDto;
import com.zahid.cinenight.features.users.service.AdminUserService.UpdateUserRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {
    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<AdminUserDto>> list(@AuthenticationPrincipal UserDetails principal) {
        return ApiResponse.ok(service.list(principal.getUsername()));
    }

    @PatchMapping("/{id}")
    public ApiResponse<AdminUserDto> update(@AuthenticationPrincipal UserDetails principal,
                                            @PathVariable Long id,
                                            @RequestBody @Valid UpdateUserRequest request) {
        return ApiResponse.ok(service.update(principal.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@AuthenticationPrincipal UserDetails principal, @PathVariable Long id) {
        service.delete(principal.getUsername(), id);
        return ApiResponse.ok("deleted");
    }
}
