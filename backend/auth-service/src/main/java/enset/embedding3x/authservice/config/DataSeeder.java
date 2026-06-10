package enset.embedding3x.authservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the demo accounts shown on the login screen.
 *
 * The UUIDs are pinned to the values used by the frontend mock data
 * (frontend/data/mockIds.ts) so that assignments / progress created in the
 * client stay coherent once authentication is backed by the real database.
 *
 * Idempotent: a user is only inserted when its email is not already present.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    private record DemoUser(
            String id, String name, String username, String email, String password,
            String role, String initials) {}

    private static final List<DemoUser> DEMO_USERS = List.of(
            new DemoUser("7aebc55c-0ce1-4e19-8f43-6d15de6cf0b7", "M. YOUSSFI Mohamed",
                    "youssfi", "youssfi@enset.ma", "teacher123", "TEACHER", "YM"),
            new DemoUser("3b58bafe-60a2-4e15-b06b-13a283b50836", "Mme. OUHMIDA Asmae",
                    "ouhmidas", "ouhmidas@enset.ma", "teacher123", "TEACHER", "OA"),
            new DemoUser("50cd96b8-e4e8-4c14-8c73-3c44918f7c93", "Toubani Badr eddine",
                    "toubani", "toubani@enset.ma", "student123", "STUDENT", "TB"),
            new DemoUser("a7e4ba17-dc62-4b0b-a2f2-d0a88c75d6ea", "Bahou houdaifa",
                    "bahou", "bahou@enset.ma", "student123", "STUDENT", "BH"),
            new DemoUser("b60380b9-8ae8-4d81-8499-59225a2d6df1", "AARAB AYMANE",
                    "aymane", "aymane@semlalia.ma", "student123", "STUDENT", "AA")
    );

    @Override
    public void run(String... args) {
        int created = 0;
        for (DemoUser u : DEMO_USERS) {
            Integer exists = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, u.email());
            if (exists != null && exists > 0) continue;

            jdbc.update(
                    "INSERT INTO users (id, username, email, password, role, name, avatar_initials, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, now())",
                    u.id(), u.username(), u.email(), passwordEncoder.encode(u.password()),
                    u.role(), u.name(), u.initials());
            created++;
        }
        if (created > 0) {
            log.info("DataSeeder: inserted {} demo account(s)", created);
        } else {
            log.info("DataSeeder: demo accounts already present, nothing to do");
        }
    }
}
