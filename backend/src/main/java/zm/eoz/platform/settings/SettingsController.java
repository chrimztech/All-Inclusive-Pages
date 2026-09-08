package zm.eoz.platform.settings;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import zm.eoz.platform.common.ApiResponse;
import zm.eoz.platform.settings.dto.FeatureFlagUpdateRequest;
import zm.eoz.platform.settings.dto.SettingUpdateRequest;

@RestController
public class SettingsController {

    private final SystemSettingRepository settingRepository;
    private final FeatureFlagRepository featureFlagRepository;

    public SettingsController(SystemSettingRepository settingRepository, FeatureFlagRepository featureFlagRepository) {
        this.settingRepository = settingRepository;
        this.featureFlagRepository = featureFlagRepository;
    }

    /** Public, unauthenticated: the admin-configurable branding/contact values the public site renders. */
    @GetMapping("/api/v1/settings/public")
    public ApiResponse<Map<String, String>> publicSettings() {
        Map<String, String> settings = settingRepository.findAll().stream()
                .filter(s -> s.getKey().startsWith("org."))
                .collect(Collectors.toMap(SystemSetting::getKey, SystemSetting::getValue));
        return ApiResponse.of(settings);
    }

    @GetMapping("/api/v1/admin/settings")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    public ApiResponse<List<SystemSetting>> list() {
        return ApiResponse.of(settingRepository.findAll());
    }

    @PutMapping("/api/v1/admin/settings/{key}")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    public ApiResponse<SystemSetting> update(@PathVariable String key, @Valid @RequestBody SettingUpdateRequest request) {
        SystemSetting setting = settingRepository.findById(key).orElseGet(() -> {
            SystemSetting s = new SystemSetting();
            s.setKey(key);
            return s;
        });
        setting.setValue(request.value());
        setting.setUpdatedAt(Instant.now());
        return ApiResponse.of(settingRepository.save(setting));
    }

    @GetMapping("/api/v1/admin/feature-flags")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    public ApiResponse<List<FeatureFlag>> listFlags() {
        return ApiResponse.of(featureFlagRepository.findAll());
    }

    @PutMapping("/api/v1/admin/feature-flags/{key}")
    @PreAuthorize("hasAuthority('SETTINGS_MANAGE')")
    public ApiResponse<FeatureFlag> updateFlag(@PathVariable String key, @RequestBody FeatureFlagUpdateRequest request) {
        FeatureFlag flag = featureFlagRepository.findById(key).orElseGet(() -> {
            FeatureFlag f = new FeatureFlag();
            f.setKey(key);
            return f;
        });
        flag.setEnabled(request.enabled());
        if (request.description() != null) {
            flag.setDescription(request.description());
        }
        flag.setUpdatedAt(Instant.now());
        return ApiResponse.of(featureFlagRepository.save(flag));
    }
}
