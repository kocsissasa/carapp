package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "cars")
public class Car {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotBlank(message = "Model is required")
    private String model;

    @NotNull(message = "Year is required")
    private Integer year;

    // kapcsolat Userrel: egy usernek több autója lehet
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    public Car() {}

    public Car(String brand, String model, Integer year, User owner) {
        this.brand = brand;
        this.model = model;
        this.year = year;
        this.owner = owner;
    }

    // getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
}
