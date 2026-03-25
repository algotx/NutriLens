package com.nutrilens.dto;

import lombok.Data;

@Data
public class ProfileRequest {
    private Integer age;
    private String gender;
    private Double heightCm;
    private Double weightKg;
    private String activityLevel;
    private String goal;
    private Double goalWeightKg;
    private Double weeklyGoalKg;
    private String dietaryPreference;
}
