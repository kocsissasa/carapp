package com.example.carapp.repository;

import com.example.carapp.model.ServiceAppointment;
import com.example.carapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ServiceAppointmentRepository extends JpaRepository<ServiceAppointment, Long> {
    List<ServiceAppointment> findByUser(User user);
    List<ServiceAppointment> findByCar_Id(Long carId);

    // ütközés ellenőrzés ugyanarra az autóra adott idősávban (egyszerű példa)
    boolean existsByCar_IdAndServiceDateTime(Long carId, LocalDateTime dateTime);
}
