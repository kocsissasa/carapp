// com/example/carapp/repository/PostReactionRepository.java
package com.example.carapp.repository;

import com.example.carapp.model.PostReaction;
import com.example.carapp.model.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.*;

public interface PostReactionRepository extends JpaRepository<PostReaction, Long> {
    Optional<PostReaction> findByPost_IdAndUser_Id(Long postId, Long userId);
    long countByPost_IdAndType(Long postId, ReactionType type);

    @Query("""
           select r.type as type, count(r) as cnt
           from PostReaction r
           where r.post.id = :postId
           group by r.type
           """)
    List<Object[]> aggregateByType(Long postId);
}
