package com.example.carapp.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

// Ez egy globális hibakezelő osztály, ami a teljes alkalmazásra érvényes.

@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 1) Bean Validációs hibák ( @Valid annotációval jelzett mezők )
     * Példa: ha UserRequest-ben az email üres vagy nem valid,
     * akkor MethodArgumentNotValidException keletkezik.
     */



    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return ResponseEntity.badRequest().body(errors); // 400
    }

/**
 * 2) Adatbázis integritási hiba (pl. UNIQUE constraint sérülés).
 * Példa:: e-mail cím duplikáció.
 */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateEmail(DataIntegrityViolationException ex) {
        Map<String, String> body = new HashMap<>();
        body.put("email", "Email already exists");
        return ResponseEntity.badRequest().body(body); // 400
    }
}
