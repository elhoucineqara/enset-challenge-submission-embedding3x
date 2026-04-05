package enset.embedding3x.authservice.controllers;

import enset.embedding3x.authservice.dtos.AuthRequest;
import enset.embedding3x.authservice.dtos.RegisterRequest;
import enset.embedding3x.authservice.dtos.TokenResponse;
import enset.embedding3x.authservice.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<TokenResponse> register(
            @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> authenticate(
            @RequestBody AuthRequest request
    ) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String refreshToken = authorizationHeader.substring(7);
            return ResponseEntity.ok(authService.refreshToken(refreshToken));
        }
        return ResponseEntity.badRequest().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout() {
        // Since we go stateless JWT, logout is usually handled client-side by deleting the token.
        // If necessary, we can implement token blacklisting via a database or Redis.
        return ResponseEntity.ok("Logout successful. Please delete your tokens on the client side.");
    }
}
