package com.example.carapp.repository;

import com.example.carapp.model.ForumCategory;
import com.example.carapp.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByCategory(ForumCategory category, Pageable pageable);
    Page<Post> findByAuthor_Id(Long authorId, Pageable pageable);
    Page<Post> findByCategoryAndRatingGreaterThanEqual(ForumCategory category, Integer minRating, Pageable pageable);
}
