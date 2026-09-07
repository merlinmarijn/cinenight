package com.zahid.cinenight.features.users.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.time.Instant;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByUsernameIgnoreCaseAndAccountType(String username, AccountType accountType);
    boolean existsByUsernameIgnoreCase(String username);
    long countByAccountTypeAndGuestSignupIpHashAndCreatedAtAfter(AccountType accountType, String ipHash, Instant after);
    List<User> findAllByOrderByCreatedAtDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<User> findAllByRoleAndStatusOrderById(UserRole role, UserStatus status);
}
