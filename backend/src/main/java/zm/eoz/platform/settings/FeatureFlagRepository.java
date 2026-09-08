package zm.eoz.platform.settings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, String> {}
