package zm.eoz.platform.demo;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import zm.eoz.platform.common.ReferenceNumberService;
import zm.eoz.platform.content.ContentService;
import zm.eoz.platform.content.dto.ContentItemRequest;
import zm.eoz.platform.identity.UserRepository;

/**
 * Demonstration data for development and demos, loaded only with the {@code demo} profile
 * ({@code SPRING_PROFILES_ACTIVE=demo}). Everything is fictional and marked "(Demo)"; emails use example.zm.
 * It runs once: if the demo organisation already exists, nothing is added.
 *
 * <p>Creates: demo candidate, employer and staff accounts; verified, pending and under-review organisations; a
 * published listing in every standard category across all application routes, plus one awaiting moderation; a
 * candidate profile and EOZ-hosted application; a service order; a content post with channel variants; a
 * recruitment project with a scorecard and pipeline; and view/click/share counts for the dashboards.
 */
@Slf4j
@Component
@Profile("demo")
@Order(100)
public class DemoDataSeeder implements ApplicationRunner {

    static final String MARKER_ORG = "Kafue Valley Agro Cooperative (Demo)";

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final ReferenceNumberService references;
    private final ContentService contentService;
    private final UserRepository userRepository;
    private final String demoPassword;

    public DemoDataSeeder(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            ReferenceNumberService references,
            ContentService contentService,
            UserRepository userRepository,
            @Value("${eoz.demo.password:Kafue-Demo-2026!}") String demoPassword) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.references = references;
        this.contentService = contentService;
        this.userRepository = userRepository;
        this.demoPassword = demoPassword;
    }

    private record Listing(
            String category, String title, String org, String location, String region, String mode, String route,
            String employmentType, String arrangement, String level, Integer salaryMin, Integer salaryMax,
            String description, String requirements) {}

    @Override
    public void run(ApplicationArguments args) {
        Long existing = jdbc.queryForObject("select count(*) from organisations where legal_name = ?", Long.class, MARKER_ORG);
        if (existing != null && existing > 0) {
            log.info("Demo data already present; skipping.");
            return;
        }
        String hash = passwordEncoder.encode(demoPassword);
        UUID candidate = user("demo.candidate@example.zm", "Natasha Phiri (Demo)", "+260 970 000 101", "CANDIDATE", hash);
        UUID employer = user("demo.employer@example.zm", "Kondwani Zulu (Demo)", "+260 970 000 102", "EMPLOYER", hash);
        UUID staff = user("demo.staff@example.zm", "Mercy Banda (Demo staff)", "+260 970 000 103", "ADMIN", hash);

        UUID kafue = organisation(MARKER_ORG, "Kafue Valley Agro", "Agriculture", "COOPERATIVE", "SMALL_5_49",
                "Plot 12, Great North Road, Kabwe", "VERIFIED", employer);
        UUID solar = organisation("Copperbelt Solar Installers Ltd (Demo)", "CopperSun Solar", "Energy", "LIMITED_COMPANY",
                "MEDIUM_50_249", "Freedom Avenue, Kitwe", "VERIFIED", employer);
        organisation("Luangwa Community Health Trust (Demo)", null, "Health", "NGO_NONPROFIT", "SMALL_5_49",
                "Great East Road, Chipata", "PENDING", employer);
        organisation("Zambezi River Tours (Demo)", null, "Tourism", "SOLE_PROPRIETORSHIP", "MICRO_1_4",
                "Mosi-oa-Tunya Road, Livingstone", "UNDER_REVIEW", employer);

        List<Listing> listings = List.of(
                new Listing("JOBS", "Farm Operations Supervisor", MARKER_ORG, "Kabwe", "Central", "EOZ_HOSTED", null,
                        "FULL_TIME", "ONSITE", "MID", 9000, 12000,
                        "Lead daily field operations across 400 hectares of maize and soya, supervising a team of 25.",
                        "Diploma in Agriculture; 3+ years supervising field teams; valid driving licence"),
                new Listing("INTERNSHIPS", "Solar Installation Graduate Intern", "Copperbelt Solar Installers Ltd (Demo)",
                        "Kitwe", "Copperbelt", "EMPLOYER_EMAIL", "internships@coppersun.example.zm",
                        "INTERNSHIP", "ONSITE", "ENTRY", 3500, 3500,
                        "Twelve-month graduate programme installing and maintaining rooftop and off-grid solar systems.",
                        "Degree or diploma in Electrical Engineering completed within the last two years"),
                new Listing("SCHOLARSHIPS", "Women in Agribusiness Scholarship 2027", MARKER_ORG, "Lusaka", "National",
                        "EXTERNAL_URL", "https://example.org/kafue-scholarship", null, null, null, null, null,
                        "Full tuition and a monthly stipend for women studying agribusiness at a Zambian university.",
                        "Zambian citizen; admitted to an accredited agribusiness programme; Grade 12 certificate"),
                new Listing("NGO OPPORTUNITIES", "Community Health Volunteer Coordinator", "Luangwa Community Health Trust (Demo)",
                        "Chipata", "Eastern", "PHYSICAL_ADDRESS", "Hand-deliver to: Luangwa Community Health Trust, Great East Road, Chipata",
                        "CONTRACT", "ONSITE", "JUNIOR", 6000, 7500,
                        "Coordinate 60 community health volunteers across four rural health posts.",
                        "Certificate in Public Health or Nursing; fluent in Nyanja"),
                new Listing("GRANTS", "Youth Agro-Processing Seed Grant", MARKER_ORG, "Lusaka", "National",
                        "EXTERNAL_URL", "https://example.org/kafue-seed-grant", null, null, null, null, null,
                        "Grants of ZMW 25,000–75,000 for youth-led businesses adding value to local produce.",
                        "Registered business owned by someone aged 18–35; two-page business plan"),
                new Listing("CONSULTANCIES", "Consultant: Solar Market Assessment, North-Western Province",
                        "Copperbelt Solar Installers Ltd (Demo)", "Solwezi", "North-Western", "EMPLOYER_EMAIL",
                        "procurement@coppersun.example.zm", "CONTRACT", "HYBRID", "SENIOR", null, null,
                        "A 30-day assessment of household demand for solar home systems in three districts.",
                        "Master's degree in Economics or Energy; two comparable assessments in the last five years"),
                new Listing("TRAINING", "Short Course: Drip Irrigation for Smallholders", MARKER_ORG, "Mongu", "Western",
                        "INFORMATION_ONLY", null, null, null, null, null, null,
                        "A free five-day practical course on low-cost drip irrigation. Register on arrival at the training centre.",
                        "Open to smallholder farmers; bring an NRC"),
                new Listing("EVENTS", "Copperbelt Clean Energy Expo", "Copperbelt Solar Installers Ltd (Demo)", "Ndola",
                        "Copperbelt", "EXTERNAL_URL", "https://example.org/clean-energy-expo", null, null, null, null, null,
                        "Two days of exhibitions and talks on solar, storage and financing for businesses and households.",
                        "Free entry; registration required"),
                new Listing("BUSINESS OPPORTUNITIES", "Distributor Partners Wanted: Solar Lanterns",
                        "Copperbelt Solar Installers Ltd (Demo)", "Kasama", "Northern", "EMPLOYER_EMAIL",
                        "partners@coppersun.example.zm", null, null, null, null, null,
                        "Become an authorised distributor of solar lanterns in Northern and Luapula provinces.",
                        "Registered business with a retail outlet; PACRA certificate"),
                new Listing("TENDERS", "Tender: Supply of Maize Seed (EOZ-DEMO-T01)", MARKER_ORG, "Kabwe", "Central",
                        "PHYSICAL_ADDRESS", "Sealed bids to: Procurement Office, Plot 12, Great North Road, Kabwe",
                        null, null, null, null, null,
                        "Supply of 20 tonnes of certified hybrid maize seed before the planting season.",
                        "ZPPA registration; tax clearance certificate; three references"));

        List<UUID> published = new ArrayList<>();
        UUID hosted = null;
        int i = 0;
        for (Listing l : listings) {
            UUID categoryId = category(l.category());
            if (categoryId == null) continue;
            UUID orgId = l.org().equals(MARKER_ORG) ? kafue : l.org().startsWith("Copperbelt Solar") ? solar : null;
            UUID id = opportunity(l, categoryId, orgId, employer, "PUBLISHED", i);
            published.add(id);
            if ("EOZ_HOSTED".equals(l.mode())) hosted = id;
            i++;
        }
        // One listing waiting in the moderation queue.
        UUID jobs = category("JOBS");
        if (jobs != null) {
            opportunity(new Listing("JOBS", "Accounts Assistant", MARKER_ORG, "Kabwe", "Central", "EMPLOYER_EMAIL",
                    "careers@kafuevalley.example.zm", "FULL_TIME", "ONSITE", "JUNIOR", 6500, 8000,
                    "Maintain the cooperative's ledgers and prepare monthly management accounts.",
                    "ZICA Technician or equivalent; Sage or QuickBooks"), jobs, kafue, employer, "PENDING_REVIEW", i);
        }

        jdbc.update(
                "insert into candidate_profiles (user_id, headline, bio, location, skills, availability, salary_expectation_min,"
                        + " salary_expectation_max, salary_currency) values (?, ?, ?, ?, ?, ?, ?, ?, 'ZMW')",
                candidate, "Agronomist with 5 years in smallholder programmes",
                "I support farmer groups to raise yields with conservation farming and simple irrigation.",
                "Kabwe", "Agronomy, Conservation farming, Data collection (KoBo), Nyanja, Bemba", "ONE_MONTH", 9000, 13000);
        if (hosted != null) {
            UUID application = jdbc.queryForObject(
                    "insert into applications (reference, opportunity_id, candidate_id, status, cover_note, submitted_at)"
                            + " values (?, ?, ?, 'SHORTLISTED', ?, now() - interval '3 days') returning id",
                    UUID.class, references.next("EOZ-APP"), hosted, candidate,
                    "I have supervised field teams of 30 in Mkushi and would welcome the chance to do the same at Kafue Valley.");
            // Stage history, so the recruitment funnel shows time-to-shortlist.
            jdbc.update("insert into application_status_history (application_id, from_status, to_status, changed_by, changed_at) values"
                            + " (?, 'SUBMITTED', 'SCREENING', ?, now() - interval '2 days'),"
                            + " (?, 'SCREENING', 'SHORTLISTED', ?, now() - interval '1 day')",
                    application, staff, application, staff);
        }
        jdbc.queryForList("select id from service_packages where slug = 'cv-writing'", UUID.class).stream().findFirst()
                .ifPresent(pkg -> jdbc.update(
                        "insert into service_orders (reference, package_id, customer_id, status, requirements, assigned_officer_id)"
                                + " values (?, ?, ?, 'IN_PROGRESS', ?, ?)",
                        references.next("EOZ-SVC"), pkg, candidate,
                        "Update my CV for agribusiness supervisor roles; current CV attached in documents.", staff));

        if (hosted != null) {
            UUID project = jdbc.queryForObject(
                    "insert into recruitment_projects (reference, title, opportunity_id, organisation_id, status, confidentiality, created_by)"
                            + " values (?, ?, ?, ?, 'OPEN', 'STANDARD', ?) returning id",
                    UUID.class, references.next("EOZ-REC"), "Farm Operations Supervisor — Kafue Valley (Demo)", hosted, kafue, staff);
            jdbc.update("insert into scorecard_criteria (project_id, name, guidance, weight, position) values"
                            + " (?, 'Field team leadership', 'Has led teams of 15+ through a full season', 3, 0),"
                            + " (?, 'Crop and soil knowledge', null, 2, 1), (?, 'Record keeping', null, 1, 2)",
                    project, project, project);
            String[][] pipeline = {
                    {"Natasha Phiri (Demo)", "demo.candidate@example.zm", "SHORTLISTED"},
                    {"Mwila Chanda (Demo)", "mwila.chanda@example.zm", "INTERVIEW"},
                    {"Bupe Mulenga (Demo)", "bupe.mulenga@example.zm", "SCREENING"},
                    {"Chileshe Tembo (Demo)", "chileshe.tembo@example.zm", "RECEIVED"}};
            for (String[] p : pipeline) {
                jdbc.update("insert into pipeline_candidates (project_id, candidate_name, candidate_email, candidate_user_id, stage, source)"
                                + " values (?, ?, ?, ?, ?, 'EOZ board')",
                        project, p[0], p[1], p[1].equals("demo.candidate@example.zm") ? candidate : null, p[2]);
            }
        }

        if (!published.isEmpty()) {
            var actor = userRepository.findById(staff).orElseThrow();
            var post = contentService.create(new ContentItemRequest(
                    "Farm Operations Supervisor — Kafue Valley", "OPPORTUNITY_POST",
                    "Kafue Valley Agro Cooperative is hiring a Farm Operations Supervisor in Kabwe. Apply through EOZ.",
                    hosted != null ? hosted : published.get(0)), actor);
            contentService.generateVariant(post.id(), "WHATSAPP", actor);
            contentService.generateVariant(post.id(), "FACEBOOK", actor);
            contentService.create(new ContentItemRequest(
                    "Afternoon career tip: tailoring your CV", "AFTERNOON_CAREER",
                    "Match the first three lines of your CV to the advert's top requirements — recruiters decide in seconds.",
                    null), actor);
        }

        log.info("Demo data loaded: {} listings. Sign in as demo.candidate@example.zm, demo.employer@example.zm or"
                + " demo.staff@example.zm with the demo password (eoz.demo.password).", published.size() + 1);
    }

    private UUID user(String email, String name, String phone, String role, String hash) {
        UUID id = jdbc.queryForObject(
                "insert into users (email, password_hash, full_name, phone, status, email_verified) values (?, ?, ?, ?, 'ACTIVE', true)"
                        + " returning id",
                UUID.class, email, hash, name, phone);
        jdbc.update("insert into user_roles (user_id, role_id) select ?, id from roles where name = ?", id, role);
        return id;
    }

    private UUID organisation(String legal, String trading, String sector, String type, String size, String address,
            String status, UUID createdBy) {
        UUID id = jdbc.queryForObject(
                "insert into organisations (legal_name, trading_name, sector, business_type, size_band, address, verification_status,"
                        + " created_by, description, website) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) returning id",
                UUID.class, legal, trading, sector, type, size, address, status, createdBy,
                "Fictional organisation used for demonstrations.", "https://example.org");
        // The creator owns it, as when an employer registers an organisation, so they can edit its listings.
        jdbc.update("insert into organisation_members (organisation_id, user_id, role_in_org, status) values (?, ?, 'OWNER', 'ACTIVE')",
                id, createdBy);
        return id;
    }

    private UUID category(String code) {
        return jdbc.queryForList("select id from opportunity_categories where code = ?", UUID.class, code)
                .stream().findFirst().orElse(null);
    }

    private UUID opportunity(Listing l, UUID categoryId, UUID orgId, UUID createdBy, String status, int i) {
        String reference = references.next("EOZ-OPP");
        String slug = l.title().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "")
                + "-" + reference.substring(reference.lastIndexOf('-') + 1);
        Instant now = Instant.now();
        Map<String, String> route = Map.of(
                "EXTERNAL_URL", "application_url", "EMPLOYER_EMAIL", "application_email", "PHYSICAL_ADDRESS", "application_address");
        String routeColumn = route.get(l.mode());
        boolean live = "PUBLISHED".equals(status);
        UUID id = jdbc.queryForObject(
                "insert into opportunities (reference, slug, title, category_id, organisation_id, organisation_name, description,"
                        + " requirements, location, region, application_mode, source, verified, status, published_at, deadline,"
                        + " opening_date, employment_type, work_arrangement, experience_level, salary_min, salary_max, salary_visible,"
                        + " currency, views_count, apply_clicks, share_count, featured, created_by)"
                        + " values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_date, ?, ?, ?, ?, ?, ?, 'ZMW', ?, ?, ?, ?, ?)"
                        + " returning id",
                UUID.class, reference, slug, l.title(), categoryId, orgId, l.org(), l.description(), l.requirements(),
                l.location(), l.region(), l.mode(), "Submitted by the organisation (demo data)", live, status,
                live ? Timestamp.from(now.minus(1 + (i * 2L), ChronoUnit.DAYS)) : null, // kept in step with version()
                Timestamp.from(now.plus(i == 1 ? 2 : 6 + i * 4L, ChronoUnit.DAYS)),
                l.employmentType(), l.arrangement(), l.level(), l.salaryMin(), l.salaryMax(), l.salaryMin() != null,
                live ? 120L + (i * 97L) % 900 : 0L, live ? 8L + (i * 13L) % 60 : 0L, live ? (i * 5L) % 25 : 0L,
                live && i < 3, createdBy);
        if (routeColumn != null) {
            jdbc.update("update opportunities set " + routeColumn + " = ? where id = ?", l.route(), id);
        }
        // Moderation history (normally written by the version recorder), so publication metrics have data:
        // submitted, approved a few hours later, published the next morning.
        Instant publishedAt = live ? now.minus(1 + (i * 2L), ChronoUnit.DAYS) : null;
        Instant submittedAt = live ? publishedAt.minus(20 + i * 3L, ChronoUnit.HOURS) : now.minus(3, ChronoUnit.HOURS);
        version(id, 1, "PENDING_REVIEW", submittedAt);
        if (live) {
            version(id, 2, "APPROVED", submittedAt.plus(2 + i, ChronoUnit.HOURS));
            version(id, 3, "PUBLISHED", publishedAt);
        }
        return id;
    }

    private void version(UUID opportunityId, int no, String status, Instant at) {
        jdbc.update("insert into opportunity_versions (opportunity_id, version_no, status, snapshot, content_hash, changed_by_name, created_at)"
                        + " values (?, ?, ?, cast(? as jsonb), md5(?), 'Demo data', ?)",
                opportunityId, no, status, "{\"status\": \"" + status + "\"}", opportunityId + status, Timestamp.from(at));
    }
}
