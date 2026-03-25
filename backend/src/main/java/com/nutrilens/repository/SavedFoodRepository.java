package com.nutrilens.repository;

import com.nutrilens.entity.SavedFood;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedFoodRepository extends JpaRepository<SavedFood, Long> {
    List<SavedFood> findByUserIdOrderByFoodNameAsc(Long userId);
}
