package com.zahid.cinenight.features.users.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuestDeviceRepository extends JpaRepository<GuestDevice, Long> {
    Optional<GuestDevice> findByDeviceHash(String deviceHash);
}
