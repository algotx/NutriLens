package com.nutrilens.dto;

import lombok.Data;

@Data
public class MealRequest {
    private String mealType;
    private String foodName;
    private Double calories;
    private Double proteinG;
    private Double carbsG;
    private Double fatG;
    private Double fiberG;
    private String servingSize;
    private String loggedAt;
    private String imageUrl;
}
