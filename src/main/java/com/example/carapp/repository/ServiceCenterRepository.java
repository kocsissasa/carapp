package com.example.carapp.repository;

import com.example.carapp.model.ServiceCenter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceCenterRepository extends JpaRepository<ServiceCenter, Long> {
    List<ServiceCenter> findByCityIgnoreCase(String city);
}
