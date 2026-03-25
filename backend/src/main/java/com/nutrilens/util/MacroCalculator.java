package com.nutrilens.util;

import com.nutrilens.entity.UserProfile;
import org.springframework.stereotype.Component;

@Component
public class MacroCalculator {

    public void calculate(UserProfile p) {
        double bmr;
        if ("male".equalsIgnoreCase(p.getGender())) {
            bmr = 10 * p.getWeightKg() + 6.25 * p.getHeightCm() - 5 * p.getAge() + 5;
        } else {
            bmr = 10 * p.getWeightKg() + 6.25 * p.getHeightCm() - 5 * p.getAge() - 161;
        }

        double multiplier;
        String activity = p.getActivityLevel() == null ? "" : p.getActivityLevel();
        if ("sedentary".equals(activity))           multiplier = 1.2;
        else if ("lightly_active".equals(activity)) multiplier = 1.375;
        else if ("very_active".equals(activity))    multiplier = 1.725;
        else if ("extra_active".equals(activity))   multiplier = 1.9;
        else                                        multiplier = 1.55;

        double tdee = bmr * multiplier;
        double weeklyKg = p.getWeeklyGoalKg() != null ? p.getWeeklyGoalKg() : 0.5;
        double dailyAdj = weeklyKg * 7700.0 / 7.0;

        double calories;
        String goal = p.getGoal() == null ? "" : p.getGoal();
        if ("lose_weight".equals(goal))                                    calories = tdee - dailyAdj;
        else if ("gain_muscle".equals(goal) || "gain_weight".equals(goal)) calories = tdee + dailyAdj;
        else                                                               calories = tdee;

        int minCalories = "male".equalsIgnoreCase(p.getGender()) ? 1500 : 1200;
        calories = Math.max(calories, minCalories);

        p.setDailyCalories((int) Math.round(calories));
        p.setDailyProteinG((int) Math.round((calories * 0.30) / 4));
        p.setDailyCarbsG((int) Math.round((calories * 0.40) / 4));
        p.setDailyFatG((int) Math.round((calories * 0.30) / 9));
    }
}
