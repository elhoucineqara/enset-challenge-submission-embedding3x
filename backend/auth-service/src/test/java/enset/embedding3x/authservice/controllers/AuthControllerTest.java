package enset.embedding3x.authservice.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import enset.embedding3x.authservice.dtos.AuthRequest;
import enset.embedding3x.authservice.dtos.RegisterRequest;
import enset.embedding3x.authservice.entities.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testSignupAndLogin() throws Exception {
        // 1. Setup Registration Request
        RegisterRequest registerRequest = RegisterRequest.builder()
                .name("Test User")
                .email("testuser@example.com")
                .password("password123")
                .role(Role.USER)
                .build();

        // 2. Perform Signup
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());

        // 3. Setup Login Request
        AuthRequest authRequest = AuthRequest.builder()
                .email("testuser@example.com")
                .password("password123")
                .build();

        // 4. Perform Login
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();
        
        // Extract Refresh token for testing /refresh
        String responseContent = result.getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(responseContent).get("refreshToken").asText();

        // 5. Perform Refresh
        mockMvc.perform(post("/api/v1/auth/refresh")
                .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
                
        // 6. Perform Logout
        mockMvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isOk());
    }
}
