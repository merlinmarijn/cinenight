package com.zahid.cinenight.config;

import com.zahid.cinenight.features.users.domain.UserStatus;
import com.zahid.cinenight.features.users.domain.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AccountStateFilter extends OncePerRequestFilter {
    private final UserRepository users;

    public AccountStateFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var context = SecurityContextHolder.getContext();
        var authentication = context.getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof UserDetails details) {
            var user = users.findByEmail(details.getUsername()).orElse(null);
            if (user == null || user.getStatus() != UserStatus.ACTIVE) {
                SecurityContextHolder.clearContext();
                chain.doFilter(request, response);
                return;
            }

            String expectedAuthority = "ROLE_" + user.getRole().name();
            boolean roleChanged = authentication.getAuthorities().stream()
                    .noneMatch(authority -> expectedAuthority.equals(authority.getAuthority()));
            if (roleChanged) {
                UserDetails refreshed = org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPasswordHash())
                        .roles(user.getRole().name())
                        .build();
                var refreshedAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                        refreshed, authentication.getCredentials(), refreshed.getAuthorities());
                refreshedAuthentication.setDetails(authentication.getDetails());
                context.setAuthentication(refreshedAuthentication);
            }
        }
        chain.doFilter(request, response);
    }
}
