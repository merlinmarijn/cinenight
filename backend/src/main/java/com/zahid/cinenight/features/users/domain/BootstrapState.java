package com.zahid.cinenight.features.users.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "app_bootstrap")
public class BootstrapState {
    @Id
    private Integer id;

    @Column(name = "admin_claimed", nullable = false)
    private boolean adminClaimed;
}
