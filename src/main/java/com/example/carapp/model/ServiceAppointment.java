package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity
@Table(name = "service_appointments")
public class ServiceAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Melyik autóra szól az időpont
    @ManyToOne(optional = false)
    @JoinColumn(name = "car_id")
    private Car car;

    // Ki foglalta (denormalizálva is tároljuk a könnyebb szűréshez)
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @NotNull(message = "Service date/time is required")
    @Future(message = "Service date/time must be in the future")
    private LocalDateTime serviceDateTime;

    @NotBlank(message = "Description is required")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

    public ServiceAppointment() {}

    // getters/setters
    public Long getId() { return id; }
    public Car getCar() { return car; }
    public User getUser() { return user; }
    public LocalDateTime getServiceDateTime() { return serviceDateTime; }
    public String getDescription() { return description; }
    public AppointmentStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setId(Long id) { this.id = id; }
    public void setCar(Car car) { this.car = car; }
    public void setUser(User user) { this.user = user; }
    public void setServiceDateTime(LocalDateTime serviceDateTime) { this.serviceDateTime = serviceDateTime; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(AppointmentStatus status) { this.status = status; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
