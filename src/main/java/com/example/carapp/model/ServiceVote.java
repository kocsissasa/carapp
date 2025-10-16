package com.example.carapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity // -> Perzisztens JPA entitás
@Table(
        name = "service_votes",  // -> Tábla neve az adatbázisban
        uniqueConstraints = {
                // ugyanaz a user ugyanarra a centerre egy hónapban csak egyszer szavazzon
                @UniqueConstraint(columnNames = {"user_id", "center_id", "voteYear", "voteMonth"})
        }
)
public class ServiceVote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "user_id") // -> Sok szavazat tartozhat egy userhez
    private User user;

    @ManyToOne(optional = false) @JoinColumn(name = "center_id") // -> Sok szavazat tartozhat egy szervizközponthoz
    private ServiceCenter center;

    @NotNull // -> rating kötelező
    @Min(1) @Max(5) // -> Csak 1..5 közötti érték engedett
    private Integer rating; // -> A leadott értékelés

    private int voteYear;   // -> Év szerinti csoportosításhoz/tároláshoz
    private int voteMonth;  // -> Hónap (1–12) szerinti csoportosításhoz

    private LocalDateTime createdAt = LocalDateTime.now(); // -> Létrehozás időpontja

    public ServiceVote() {}

    // getters/setters
    public Long getId() { return id; } // -> PK lekérése
    public User getUser() { return user; }  // -> Ki szavazott
    public void setUser(User user) { this.user = user; }

    public ServiceCenter getCenter() { return center; } // -> Melyik szervizre szavazott
    public void setCenter(ServiceCenter center) { this.center = center; }

    public Integer getRating() { return rating; } // -> Értékelés
    public void setRating(Integer rating) { this.rating = rating; }

    public int getVoteYear() { return voteYear; }  // -> Szavazás éve
    public void setVoteYear(int voteYear) { this.voteYear = voteYear; }

    public int getVoteMonth() { return voteMonth; } // -> Szavazás hónapja
    public void setVoteMonth(int voteMonth) { this.voteMonth = voteMonth; }

    public LocalDateTime getCreatedAt() { return createdAt; } // -> Létrehozás időpontja
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
