package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "service_votes",
        uniqueConstraints = {
                // ugyanaz a user ugyanarra a centerre egy hónapban csak egyszer szavazzon
                @UniqueConstraint(columnNames = {"user_id", "center_id", "voteYear", "voteMonth"})
        }
)
public class ServiceVote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false) @JoinColumn(name = "center_id")
    private ServiceCenter center;

    @NotNull
    @Min(1) @Max(5)
    private Integer rating; // 1–5 csillag

    private int voteYear;   // aggregáláshoz
    private int voteMonth;  // aggregáláshoz

    private LocalDateTime createdAt = LocalDateTime.now();

    public ServiceVote() {}

    // getters/setters
    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public ServiceCenter getCenter() { return center; }
    public void setCenter(ServiceCenter center) { this.center = center; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public int getVoteYear() { return voteYear; }
    public void setVoteYear(int voteYear) { this.voteYear = voteYear; }

    public int getVoteMonth() { return voteMonth; }
    public void setVoteMonth(int voteMonth) { this.voteMonth = voteMonth; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
