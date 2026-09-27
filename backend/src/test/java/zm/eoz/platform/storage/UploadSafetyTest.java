package zm.eoz.platform.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** Uploads are checked by content, not the browser's claimed type, and file names cannot inject into headers. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UploadSafetyTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void disguisedFilesAreRefusedAndRealOnesAccepted() throws Exception {
        Cookie cookie = candidate();
        String userId = userId(cookie);

        String[][] disguised = {
                {"cv.pdf", "application/pdf", "<html><script>alert(1)</script></html>"},
                {"photo.png", "image/png", "GIF89a not a png"},
                {"cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "#!/bin/sh\nrm -rf /"},
                {"photo.jpg", "image/jpeg", "\u0000\u0000"},
        };
        for (String[] f : disguised) {
            mockMvc.perform(multipart("/api/v1/files").file(new MockMultipartFile("file", f[0], f[1], f[2].getBytes(StandardCharsets.UTF_8)))
                            .param("ownerType", "CANDIDATE_DOCUMENT").param("ownerId", userId).cookie(cookie))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("don't match its type")));
        }

        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
        MvcResult ok = mockMvc.perform(multipart("/api/v1/files")
                        .file(new MockMultipartFile("file", "C:\\Users\\me\\Pictures\\my \"best\"\r\nX-Evil: 1.png", "image/png", png))
                        .param("ownerType", "CANDIDATE_DOCUMENT").param("ownerId", userId).cookie(cookie))
                .andExpect(status().isOk())
                .andReturn();
        String id = JsonPath.read(ok.getResponse().getContentAsString(), "$.data.id");
        String name = JsonPath.read(ok.getResponse().getContentAsString(), "$.data.fileName");
        // The client's folder path and control characters are dropped.
        assertThat(name).isEqualTo("my \"best\"X-Evil: 1.png");

        MvcResult download = mockMvc.perform(get("/api/v1/files/" + id + "/download").cookie(cookie))
                .andExpect(status().isOk())
                .andReturn();
        String disposition = download.getResponse().getHeader("Content-Disposition");
        assertThat(disposition).startsWith("attachment;").doesNotContain("\r").doesNotContain("\n");
        assertThat(download.getResponse().getHeaderNames()).doesNotContain("X-Evil");
        assertThat(download.getResponse().getContentAsByteArray()).isEqualTo(png);
    }

    @Test
    void signatureCheckCoversEveryAcceptedType() {
        assertThat(FileStorageService.matchesSignature("application/pdf", "%PDF-1.7".getBytes())).isTrue();
        assertThat(FileStorageService.matchesSignature("application/msword",
                new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1})).isTrue();
        assertThat(FileStorageService.matchesSignature("image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isTrue();
        assertThat(FileStorageService.matchesSignature("application/pdf", new byte[] {'%', 'P'})).isFalse();
        assertThat(FileStorageService.matchesSignature("text/html", "<html>".getBytes())).isFalse();
    }

    private Cookie candidate() throws Exception {
        String email = "it-upload-" + System.nanoTime() + "@example.zm";
        mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"IT Upload\",\"email\":\"" + email
                                + "\",\"password\":\"Password123!\",\"accountType\":\"CANDIDATE\"}"))
                .andExpect(status().isOk());
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk()).andReturn();
        return login.getResponse().getCookie("eoz_at");
    }

    private String userId(Cookie cookie) throws Exception {
        MvcResult me = mockMvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isOk()).andReturn();
        return JsonPath.read(me.getResponse().getContentAsString(), "$.data.id");
    }
}
