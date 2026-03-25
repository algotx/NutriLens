package com.nutrilens.entity;

import javax.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Integer age;
    private String gender;
    private Double heightCm;
    private Double weightKg;
    private String activityLevel;
    private String goal;
    private Double goalWeightKg;
    private Double weeklyGoalKg;
    private String dietaryPreference;

    private Integer dailyCalories;
    private Integer dailyProteinG;
    private Integer dailyCarbsG;
    private Integer dailyFatG;

    private LocalDateTime updatedAt = LocalDateTime.now();
}
