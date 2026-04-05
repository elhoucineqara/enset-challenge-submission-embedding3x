package enset.embedding3x.authservice.services;

import enset.embedding3x.authservice.dtos.AuthRequest;
import enset.embedding3x.authservice.dtos.RegisterRequest;
import enset.embedding3x.authservice.dtos.TokenResponse;
import enset.embedding3x.authservice.entities.Role;
import enset.embedding3x.authservice.entities.User;
import enset.embedding3x.authservice.repositories.UserRepository;
import enset.embedding3x.authservice.security.CustomUserDetails;
import enset.embedding3x.authservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public TokenResponse register(RegisterRequest request) {
        var user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : Role.USER)
                .build();
        
        repository.save(user);
        
        var userDetails = new CustomUserDetails(user);
        var jwtToken = jwtUtil.generateToken(userDetails);
        var refreshToken = jwtUtil.generateRefreshToken(userDetails);
        
        return TokenResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public TokenResponse authenticate(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow();
        var userDetails = new CustomUserDetails(user);
        var jwtToken = jwtUtil.generateToken(userDetails);
        var refreshToken = jwtUtil.generateRefreshToken(userDetails);
        
        return TokenResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtUtil.isTokenValid(refreshToken)) {
            throw new RuntimeException("Refresh token is invalid");
        }
        String userEmail = jwtUtil.extractUsername(refreshToken);
        var user = repository.findByEmail(userEmail)
                .orElseThrow();
        var userDetails = new CustomUserDetails(user);
        
        var jwtToken = jwtUtil.generateToken(userDetails);
        
        return TokenResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken) // Can keep the same or issue a new one
                .build();
    }
}
