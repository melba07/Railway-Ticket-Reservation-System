package com.college.railway.controller;

import com.college.railway.model.CancellationResult;
import com.college.railway.model.Reservation;
import com.college.railway.model.ReservationBoard;
import com.college.railway.model.ReservationInput;
import com.college.railway.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @GetMapping
    public ReservationBoard getReservations() {
        return reservationService.getBoard();
    }

    @PostMapping
    public ResponseEntity<Reservation> bookReservation(
            @Valid @RequestBody ReservationInput input
    ) {
        Reservation reservation = reservationService.book(input);
        return ResponseEntity.status(HttpStatus.CREATED).body(reservation);
    }

    @GetMapping("/{pnr}")
    public Reservation getReservationByPnr(@PathVariable String pnr) {
        return reservationService.findByPnr(pnr);
    }

    @DeleteMapping("/{pnr}")
    public CancellationResult cancelReservation(@PathVariable String pnr) {
        return reservationService.cancel(pnr);
    }
}
