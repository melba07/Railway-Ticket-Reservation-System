package com.college.railway.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReservationInput(
        @NotBlank
        @Size(min = 2, max = 60)
        String passengerName,

        @NotNull
        @Min(1)
        @Max(120)
        Integer passengerAge
) {
}
