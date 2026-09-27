package zm.eoz.platform.demo;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/** The demo profile loads a complete, fictional data set exactly once. */
@SpringBootTest
@ActiveProfiles({"test", "demo"})
class DemoDataSeederTest {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private DemoDataSeeder seeder;

    @Test
    void loadsEveryAreaOnceAndOnlyFictionalContacts() throws Exception {
        seeder.run(null); // already ran at start-up; a second run must add nothing
        seeder.run(null);

        assertThat(count("select count(*) from organisations where legal_name = ?", DemoDataSeeder.MARKER_ORG)).isEqualTo(1);
        List<String> missing = jdbc.queryForList(
                "select c.code from opportunity_categories c where c.code in ('JOBS','INTERNSHIPS','SCHOLARSHIPS',"
                        + "'NGO OPPORTUNITIES','GRANTS','CONSULTANCIES','TRAINING','EVENTS','BUSINESS OPPORTUNITIES','TENDERS')"
                        + " and not exists (select 1 from opportunities o where o.category_id = c.id and o.status = 'PUBLISHED'"
                        + " and o.source = 'Submitted by the organisation (demo data)')",
                String.class);
        assertThat(missing).isEmpty();
        assertThat(count("select count(distinct application_mode) from opportunities where source = 'Submitted by the organisation (demo data)'"))
                .isGreaterThanOrEqualTo(5);
        assertThat(count("select count(*) from opportunities where source = 'Submitted by the organisation (demo data)' and status = 'PENDING_REVIEW'"))
                .isEqualTo(1);
        assertThat(count("select count(distinct verification_status) from organisations where legal_name like '%(Demo)'"))
                .isGreaterThanOrEqualTo(3);
        assertThat(count("select count(*) from applications a join users u on u.id = a.candidate_id where u.email = 'demo.candidate@example.zm'"))
                .isEqualTo(1);
        assertThat(count("select count(*) from service_orders o join users u on u.id = o.customer_id where u.email = 'demo.candidate@example.zm'"))
                .isEqualTo(1);
        assertThat(count("select count(*) from content_variants v join content_items c on c.id = v.content_item_id"
                        + " where c.title = 'Farm Operations Supervisor — Kafue Valley'"))
                .isEqualTo(2);
        assertThat(count("select count(*) from pipeline_candidates p join recruitment_projects r on r.id = p.project_id"
                        + " where r.title like '%(Demo)'"))
                .isEqualTo(4);
        // The demo employer owns the demo organisations, so they can manage those listings.
        assertThat(count("select count(*) from organisation_members m join users u on u.id = m.user_id"
                        + " where u.email = 'demo.employer@example.zm' and m.role_in_org = 'OWNER'"))
                .isGreaterThanOrEqualTo(4);
        // Demo accounts and contacts are fictional.
        assertThat(jdbc.queryForList("select email from users where full_name like '%(Demo%'", String.class))
                .allMatch(e -> e.endsWith("@example.zm"));
    }

    private long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }
}
