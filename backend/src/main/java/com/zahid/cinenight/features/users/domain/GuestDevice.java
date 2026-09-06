package com.zahid.cinenight.features.users.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Entity
@Table(name = "guest_devices", uniqueConstraints = {
        @UniqueConstraint(name = "uk_guest_devices_hash", columnNames = "device_hash")
})
public class GuestDevice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_guest_devices_user"))
    private User user;

    @Column(name = "device_hash", nullable = false, length = 64)
    private String deviceHash;

    @Column(name = "last_ip_hash", nullable = false, length = 64)
    private String lastIpHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;
}
