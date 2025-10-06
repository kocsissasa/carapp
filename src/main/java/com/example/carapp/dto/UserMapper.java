package com.example.carapp.dto;

import com.example.carapp.dto.UserRequest;
import com.example.carapp.dto.UserResponse;
import com.example.carapp.model.User;

/* Segédosztály, amely a User entitást és a DTO-kat
 * (UserRequest, UserResponse) alakítja át egymásba.
 */

public class UserMapper {

    // DTO → Entity (regisztrációkor)
    public static User toEntity(UserRequest dto) {
        return new User(dto.getName(), dto.getEmail(), dto.getPassword());
    }
    // Entity → DTO (válasz)
    public static UserResponse toResponse(User entity) {
        return new UserResponse(entity.getId(), entity.getName(), entity.getEmail());
    }
}
