package enset.embedding3x.tpservice.controller;

import enset.embedding3x.tpservice.entity.TP;
import enset.embedding3x.tpservice.security.JwtService;
import enset.embedding3x.tpservice.service.TPService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tps")
@RequiredArgsConstructor
public class TPController {

    private final TPService tpService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<List<TP>> getAllTPs(
            @RequestParam(required = false) String createdBy,
            @RequestHeader("Authorization") String authHeader) {
        if (createdBy != null) {
            return ResponseEntity.ok(tpService.findByCreatedBy(createdBy));
        }
        return ResponseEntity.ok(tpService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TP> getTP(@PathVariable String id) {
        return ResponseEntity.ok(tpService.findById(id));
    }

    @PostMapping
    public ResponseEntity<TP> createTP(
            @RequestBody Map<String, Object> data,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(tpService.create(data, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TP> updateTP(
            @PathVariable String id,
            @RequestBody Map<String, Object> data,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return ResponseEntity.ok(tpService.update(id, data, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTP(
            @PathVariable String id,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        tpService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler({IllegalArgumentException.class, SecurityException.class})
    public ResponseEntity<Map<String, String>> handleErrors(RuntimeException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    private String extractUserId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtService.extractUserId(token);
    }
}
