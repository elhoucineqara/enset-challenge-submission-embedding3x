package enset.embedding3x.tpservice.controller;

import enset.embedding3x.tpservice.entity.Progress;
import enset.embedding3x.tpservice.security.JwtService;
import enset.embedding3x.tpservice.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<List<Progress>> getProgress(
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String tpId) {
        if (studentId != null) return ResponseEntity.ok(progressService.findByStudent(studentId));
        if (tpId != null) return ResponseEntity.ok(progressService.findByTp(tpId));
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{studentId}/{tpId}")
    public ResponseEntity<Progress> getProgressByStudentAndTp(
            @PathVariable String studentId,
            @PathVariable String tpId) {
        return progressService.findByStudentAndTp(studentId, tpId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{tpId}")
    public ResponseEntity<Progress> upsertProgress(
            @PathVariable String tpId,
            @RequestBody Map<String, Object> data,
            @RequestHeader("Authorization") String authHeader) {
        String studentId = extractUserId(authHeader);
        return ResponseEntity.ok(progressService.upsert(studentId, tpId, data));
    }

    @PutMapping("/{studentId}/{tpId}")
    public ResponseEntity<Progress> updateProgress(
            @PathVariable String studentId,
            @PathVariable String tpId,
            @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(progressService.upsert(studentId, tpId, data));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleErrors(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    private String extractUserId(String authHeader) {
        return jwtService.extractUserId(authHeader.replace("Bearer ", ""));
    }
}
