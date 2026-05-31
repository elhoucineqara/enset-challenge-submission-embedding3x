package enset.embedding3x.authservice.dto;

import enset.embedding3x.authservice.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private String id;
    private String name;
    private String username;
    private String email;
    private Role role;
    private String avatarInitials;
    private LocalDateTime createdAt;
}
