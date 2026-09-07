package com.zahid.cinenight.features.users.domain;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BootstrapStateRepository extends JpaRepository<BootstrapState, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select state from BootstrapState state where state.id = :id")
    Optional<BootstrapState> findByIdForUpdate(@Param("id") Integer id);
}
