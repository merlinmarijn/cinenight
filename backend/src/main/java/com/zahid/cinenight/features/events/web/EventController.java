package com.zahid.cinenight.features.events.web;

import com.zahid.cinenight.common.api.ApiResponse;
import com.zahid.cinenight.features.events.service.EventService;
import com.zahid.cinenight.features.events.service.EventService.CreateEventReq;
import com.zahid.cinenight.features.events.service.EventService.EventDto;
import com.zahid.cinenight.features.events.service.EventService.RsvpReq;
import com.zahid.cinenight.features.users.domain.UserRepository;
import jakarta.validation.Valid;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService service;
    private final UserRepository users;
    private final MessageSource messageSource;

    public EventController(EventService service, UserRepository users, MessageSource messageSource) {
        this.service = service;
        this.users = users;
        this.messageSource = messageSource;
    }

    private Long currentUserId(UserDetails principal) {
        if (principal == null)
            throw new AccessDeniedException(messageSource.getMessage("auth.login.required", null, LocaleContextHolder.getLocale()));
        return users.findByEmail(principal.getUsername()).orElseThrow().getId();
    }

    @PostMapping
    public ApiResponse<EventDto> create(@AuthenticationPrincipal UserDetails principal,
                                        @RequestBody @Valid CreateEventReq req) {
        return ApiResponse.ok(service.create(req, currentUserId(principal)));
    }

    @GetMapping("/{id}")
    public ApiResponse<EventDto> get(@AuthenticationPrincipal UserDetails principal,
                                     @PathVariable Long id) {
        return ApiResponse.ok(service.get(id, currentUserId(principal)));
    }

    @PostMapping("/{id}/rsvp")
    public ApiResponse<String> rsvp(@AuthenticationPrincipal UserDetails principal,
                                    @PathVariable Long id,
                                    @RequestBody @Valid RsvpReq req) {
        service.rsvp(id, currentUserId(principal), req);
        return ApiResponse.ok("ok");
    }

    /** Public: ICS indirme */
    @GetMapping(value = "/{id}/ics", produces = "text/calendar; charset=UTF-8")
    public ResponseEntity<String> ics(@PathVariable Long id) {
        String ics = service.ics(id);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "calendar"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event-" + id + ".ics\"")
                .body(ics);
    }
}
