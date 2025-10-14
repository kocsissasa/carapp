package com.example.carapp.repository;

import com.example.carapp.model.ForumCategory;
import com.example.carapp.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findByCategoryOrderByCreatedAtDesc(ForumCategory category);
}
