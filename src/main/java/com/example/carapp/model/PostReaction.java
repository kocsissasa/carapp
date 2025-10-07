// com/example/carapp/model/PostReaction.java
package com.example.carapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_reactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_post_user", columnNames = {"post_id", "user_id"}
        )
)
public class PostReaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(optional = false) @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ReactionType type;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public ReactionType getType() { return type; }
    public void setType(ReactionType type) { this.type = type; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
