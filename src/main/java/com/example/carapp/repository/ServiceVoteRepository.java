package com.example.carapp.repository;

import com.example.carapp.model.ServiceVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;

public interface ServiceVoteRepository extends JpaRepository<ServiceVote, Long> {

    Optional<ServiceVote> findByUser_IdAndCenter_IdAndVoteYearAndVoteMonth(Long userId, Long centerId, int year, int month);

    // havi top szervizek átlaggal és szavazatszámmal
    @Query("""
        SELECT sv.center.id as centerId,
               sv.center.name as name,
               sv.center.city as city,
               sv.center.address as address,
               AVG(sv.rating) as avgRating,
               COUNT(sv.id) as votes
        FROM ServiceVote sv
        WHERE sv.voteYear = :year AND sv.voteMonth = :month
        GROUP BY sv.center.id, sv.center.name, sv.center.city, sv.center.address
        ORDER BY avgRating DESC, votes DESC
    """)
    List<Object[]> findMonthlyTopCenters(int year, int month);
}
