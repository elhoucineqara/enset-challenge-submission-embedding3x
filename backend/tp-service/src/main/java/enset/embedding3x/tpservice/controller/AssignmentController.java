package enset.embedding3x.tpservice.controller;

import enset.embedding3x.tpservice.entity.Assignment;
import enset.embedding3x.tpservice.security.JwtService;
import enset.embedding3x.tpservice.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<List<Assignment>> getAssignments(
            @RequestParam(required = false) String teacherId,
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String tpId) {

        if (teacherId != null) return ResponseEntity.ok(assignmentService.findByTeacher(teacherId));
        if (studentId != null) return ResponseEntity.ok(assignmentService.findByStudent(studentId));
        if (tpId != null) return ResponseEntity.ok(assignmentService.findByTp(tpId));
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Assignment> getAssignment(@PathVariable String id) {
        return ResponseEntity.ok(assignmentService.findById(id));
    }

    @PostMapping
    public ResponseEntity<Assignment> createAssignment(
            @RequestBody Map<String, Object> data,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(data, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssignment(
            @PathVariable String id,
            @RequestHeader("Authorization") String authHeader) {
        String userId = extractUserId(authHeader);
        assignmentService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler({IllegalArgumentException.class, SecurityException.class})
    public ResponseEntity<Map<String, String>> handleErrors(RuntimeException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    private String extractUserId(String authHeader) {
        return jwtService.extractUserId(authHeader.replace("Bearer ", ""));
    }
}
