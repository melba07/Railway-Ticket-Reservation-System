package com.college.railway.model;

import java.util.List;

public record ReservationBoard(
        int capacity,
        int confirmedCount,
        int waitingCount,
        int seatsAvailable,
        List<Reservation> confirmed,
        List<Reservation> waiting
) {
}
