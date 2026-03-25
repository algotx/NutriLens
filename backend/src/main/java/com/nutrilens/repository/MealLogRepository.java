package com.nutrilens.repository;

import com.nutrilens.entity.MealLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface MealLogRepository extends JpaRepository<MealLog, Long> {

    List<MealLog> findByUserIdAndLoggedAtOrderByCreatedAtAsc(Long userId, LocalDate loggedAt);

    @Query("SELECT COALESCE(SUM(m.calories),0), COALESCE(SUM(m.proteinG),0), " +
           "COALESCE(SUM(m.carbsG),0), COALESCE(SUM(m.fatG),0), " +
           "COALESCE(SUM(m.fiberG),0), COUNT(m) " +
           "FROM MealLog m WHERE m.user.id = :userId AND m.loggedAt = :date")
    List<Object[]> getDailySummary(@Param("userId") Long userId, @Param("date") LocalDate date);
}
