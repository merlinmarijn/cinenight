package com.zahid.cinenight.web;

import com.zahid.cinenight.features.users.domain.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Controller
public class WebController {

    private final UserRepository userRepository;

    @Value("${app.frontend.base-url}")
    private String frontendUrl;

    public WebController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/about")
    public String aboutPage(Model model) {
        long userCount = userRepository.count();

        String serverTime = LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("dd MMMM yyyy, HH:mm:ss", Locale.ENGLISH)
        );

        model.addAttribute("appName", "CineNight");
        model.addAttribute("studentName", "Zahid Esad");
        model.addAttribute("userCount", userCount);
        model.addAttribute("serverTime", serverTime);
        model.addAttribute("frontendUrl", frontendUrl);

        return "about";
    }
}
