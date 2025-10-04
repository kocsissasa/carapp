package com.example.carapp.dto;

import com.example.carapp.dto.UserRequest;
import com.example.carapp.dto.UserResponse;
import com.example.carapp.model.User;

public class UserMapper {

    public static User toEntity(UserRequest dto) {
        return new User(dto.getName(), dto.getEmail(), dto.getPassword());
    }

    public static UserResponse toResponse(User entity) {
        return new UserResponse(entity.getId(), entity.getName(), entity.getEmail());
    }
}
