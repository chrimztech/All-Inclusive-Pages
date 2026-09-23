package zm.eoz.platform.application.dto;

import java.util.UUID;

/** resumeFileId is optional — when omitted, the candidate's profile resume (if any) is used. */
public record ApplicationRequest(String coverNote, UUID resumeFileId) {}
