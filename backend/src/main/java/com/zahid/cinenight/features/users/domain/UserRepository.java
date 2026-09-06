package com.zahid.cinenight.features.users.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.time.Instant;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByUsernameIgnoreCaseAndAccountType(String username, AccountType accountType);
    boolean existsByUsernameIgnoreCase(String username);
    long countByAccountTypeAndGuestSignupIpHashAndCreatedAtAfter(AccountType accountType, String ipHash, Instant after);
}
