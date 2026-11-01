package zm.eoz.platform.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Malformed requests get a clear 4xx Problem Detail, never a 500 "unexpected error". */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ErrorResponseTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void aMissingRequiredParameterIsABadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/unsubscribe"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://eoz.zm/problems/missing-parameter"))
                .andExpect(jsonPath("$.detail").value("The 'token' parameter is required."));
    }

    @Test
    void aMalformedIdIsABadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/organisations/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://eoz.zm/problems/invalid-parameter"));
    }

    @Test
    void anUnreadableBodyIsABadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://eoz.zm/problems/malformed-request"));
    }
}
