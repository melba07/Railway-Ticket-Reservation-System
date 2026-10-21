package com.college.railway.service;

import com.college.railway.model.CancellationResult;
import com.college.railway.model.Reservation;
import com.college.railway.model.ReservationBoard;
import com.college.railway.model.ReservationInput;
import com.college.railway.model.ReservationStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;

@Service
public class ReservationService {
    private static final int SEAT_CAPACITY = 5;

    // ArrayList stores the confirmed passengers in reservation order.
    private final List<Reservation> confirmedPassengers = new ArrayList<>();

    // ArrayDeque is used as a FIFO queue: passengers join at the back and
    // the first person in line is promoted with poll().
    private final Queue<Reservation> waitingPassengers = new ArrayDeque<>();

    // Remember issued PNRs so a cancelled ticket number is never reused.
    private final Set<String> issuedPnrs = new HashSet<>();

    public synchronized ReservationBoard getBoard() {
        List<Reservation> confirmed = List.copyOf(confirmedPassengers);
        List<Reservation> waiting = List.copyOf(waitingPassengers);
        int available = SEAT_CAPACITY - confirmed.size();

        return new ReservationBoard(
                SEAT_CAPACITY,
                confirmed.size(),
                waiting.size(),
                available,
                confirmed,
                waiting
        );
    }

    public synchronized Reservation book(ReservationInput input) {
        String name = input.passengerName().trim();
        if (name.length() < 2) {
            throw new IllegalArgumentException("Passenger name must have at least 2 characters.");
        }

        String pnr = createUniquePnr();
        Integer seatNumber = findAvailableSeat();

        if (seatNumber != null) {
            Reservation reservation = new Reservation(
                    pnr, name, input.passengerAge(),
                    ReservationStatus.CONFIRMED, seatNumber, null
            );
            confirmedPassengers.add(reservation);
            return reservation;
        }

        Reservation reservation = new Reservation(
                pnr, name, input.passengerAge(),
                ReservationStatus.WAITING, null, waitingPassengers.size() + 1
        );
        waitingPassengers.offer(reservation);
        return reservation;
    }

    public synchronized Reservation findByPnr(String pnr) {
        for (Reservation passenger : confirmedPassengers) {
            if (passenger.pnr().equalsIgnoreCase(pnr)) {
                return passenger;
            }
        }

        for (Reservation passenger : waitingPassengers) {
            if (passenger.pnr().equalsIgnoreCase(pnr)) {
                return passenger;
            }
        }

        throw new ReservationNotFoundException(pnr);
    }

    public synchronized CancellationResult cancel(String pnr) {
        Reservation cancelled = findByPnr(pnr);
        Reservation promoted = null;

        if (cancelled.status() == ReservationStatus.CONFIRMED) {
            confirmedPassengers.removeIf(passenger -> passenger.pnr().equalsIgnoreCase(pnr));

            // The next waiting passenger receives the seat that was just freed.
            Reservation firstWaiting = waitingPassengers.poll();
            if (firstWaiting != null) {
                promoted = new Reservation(
                        firstWaiting.pnr(),
                        firstWaiting.passengerName(),
                        firstWaiting.passengerAge(),
                        ReservationStatus.CONFIRMED,
                        cancelled.seatNumber(),
                        null
                );
                confirmedPassengers.add(promoted);
            }
        } else {
            removeFromWaitingQueue(pnr);
        }

        refreshQueuePositions();

        String message = promoted == null
                ? "Ticket cancelled successfully."
                : firstLetterUppercase(promoted.passengerName())
                    + " was automatically confirmed from the waiting list.";

        return new CancellationResult(cancelled.pnr(), cancelled.passengerName(), promoted, message);
    }

    private Integer findAvailableSeat() {
        for (int seat = 1; seat <= SEAT_CAPACITY; seat++) {
            final int seatToCheck = seat;
            boolean occupied = confirmedPassengers.stream()
                    .anyMatch(passenger -> passenger.seatNumber() == seatToCheck);
            if (!occupied) {
                return seat;
            }
        }
        return null;
    }

    private String createUniquePnr() {
        String pnr;
        do {
            String randomPart = UUID.randomUUID().toString()
                    .replace("-", "")
                    .substring(0, 8)
                    .toUpperCase();
            pnr = "RLY-" + randomPart;
        } while (!issuedPnrs.add(pnr));
        return pnr;
    }

    private void removeFromWaitingQueue(String pnr) {
        Iterator<Reservation> iterator = waitingPassengers.iterator();
        while (iterator.hasNext()) {
            if (iterator.next().pnr().equalsIgnoreCase(pnr)) {
                iterator.remove();
                return;
            }
        }
    }

    private void refreshQueuePositions() {
        Queue<Reservation> updatedQueue = new ArrayDeque<>();
        int position = 1;

        for (Reservation passenger : waitingPassengers) {
            updatedQueue.offer(new Reservation(
                    passenger.pnr(),
                    passenger.passengerName(),
                    passenger.passengerAge(),
                    ReservationStatus.WAITING,
                    null,
                    position++
            ));
        }

        waitingPassengers.clear();
        waitingPassengers.addAll(updatedQueue);
    }

    private String firstLetterUppercase(String name) {
        if (name.isEmpty()) {
            return name;
        }
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }
}
