package zm.eoz.platform.reporting;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The platform's defined metrics (spec §12), computed for a reporting window. Window boundaries are whole days in
 * Africa/Lusaka: {@code from} 00:00 up to, but not including, the day after {@code to}. Every metric carries its own
 * definition (numerator, denominator, filters), which the dashboard shows and docs/metrics.md mirrors.
 *
 * <p>No metric breaks candidates down by personal characteristics, so there are no small groups to suppress.
 */
@Service
public class MetricsService {

    public static final ZoneId ZONE = ZoneId.of("Africa/Lusaka");

    public record Metric(String key, String label, Double value, String unit, String definition) {}

    public record Breakdown(String label, List<NameCount> items) {}

    public record Family(String key, String label, List<Metric> metrics, List<Breakdown> breakdowns) {}

    public record Report(LocalDate from, LocalDate to, String timeZone, List<Family> families) {}

    private final JdbcTemplate jdbc;

    public MetricsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Report compute(LocalDate from, LocalDate to) {
        Timestamp start = Timestamp.from(from.atStartOfDay(ZONE).toInstant());
        Timestamp end = Timestamp.from(to.plusDays(1).atStartOfDay(ZONE).toInstant());
        return new Report(from, to, ZONE.getId(), List.of(
                reach(start, end),
                publication(start, end),
                funnel(start, end),
                employers(start, end),
                services(start, end),
                dataQuality()));
    }

    private Family reach(Timestamp s, Timestamp e) {
        String published = "from opportunities where published_at >= ? and published_at < ?";
        Double views = num("select coalesce(sum(views_count), 0) " + published, s, e);
        Double clicks = num("select coalesce(sum(apply_clicks), 0) " + published, s, e);
        return new Family("reach", "Opportunity reach", List.of(
                m("reach.listings", "Listings published", num("select count(*) " + published, s, e), "count",
                        "Listings whose first publication time falls in the window."),
                m("reach.views", "Total views", views, "count",
                        "Sum of detail-page views, to date, of listings published in the window. Unique visitors are not"
                                + " tracked (no visitor identifiers are stored), so there is no unique-views figure."),
                m("reach.applyClicks", "External application clicks", clicks, "count",
                        "Sum of clicks on the official application link or email, to date, of listings published in the window."),
                m("reach.clickRate", "Click-through rate", pct(clicks, views), "percent",
                        "External application clicks ÷ total views, for listings published in the window."),
                m("reach.shares", "Shares", num("select coalesce(sum(share_count), 0) " + published, s, e), "count",
                        "Sum of share-button uses, to date, of listings published in the window."),
                m("reach.saves", "Saves", num("select count(*) from saved_opportunities where saved_at >= ? and saved_at < ?", s, e),
                        "count", "Times any listing was saved by a candidate during the window."),
                m("reach.alertDeliveries", "Alert deliveries",
                        num("select count(*) from alert_deliveries where delivered_at >= ? and delivered_at < ?", s, e), "count",
                        "Listings delivered to candidates through job alerts during the window (one per listing per alert).")),
                List.of(new Breakdown("Published by category", names(
                        "select c.name, count(*) from opportunities o join opportunity_categories c on c.id = o.category_id"
                                + " where o.published_at >= ? and o.published_at < ? group by c.name order by 2 desc", s, e))));
    }

    private Family publication(Timestamp s, Timestamp e) {
        // Submissions: listings whose first PENDING_REVIEW version is in the window.
        String submitted = "with sub as (select opportunity_id, min(created_at) submitted_at from opportunity_versions"
                + " where status = 'PENDING_REVIEW' group by opportunity_id having min(created_at) >= ? and min(created_at) < ?)";
        Double count = num(submitted + " select count(*) from sub", s, e);
        return new Family("publication", "Publication efficiency", List.of(
                m("publication.submitted", "Submitted for review", count, "count",
                        "Listings first sent to moderation (first PENDING_REVIEW) during the window."),
                m("publication.hoursToApproval", "Median time to approval", num(submitted
                                + " select percentile_cont(0.5) within group (order by extract(epoch from (a.at - sub.submitted_at)) / 3600)"
                                + " from sub join lateral (select min(created_at) at from opportunity_versions v where v.opportunity_id = sub.opportunity_id"
                                + " and v.status in ('APPROVED','SCHEDULED','PUBLISHED') and v.created_at >= sub.submitted_at) a on a.at is not null",
                        s, e), "hours",
                        "Median hours from first submission to first approval (APPROVED, SCHEDULED or PUBLISHED), for listings"
                                + " submitted in the window that have been approved. Includes time spent with the submitter after a"
                                + " change request."),
                m("publication.hoursApprovalToPublish", "Median approval-to-publication time", num(submitted
                                + " select percentile_cont(0.5) within group (order by extract(epoch from (p.at - a.at)) / 3600)"
                                + " from sub join lateral (select min(created_at) at from opportunity_versions v where v.opportunity_id = sub.opportunity_id"
                                + " and v.status = 'APPROVED') a on a.at is not null join lateral (select min(created_at) at from opportunity_versions v"
                                + " where v.opportunity_id = sub.opportunity_id and v.status = 'PUBLISHED' and v.created_at >= a.at) p on p.at is not null",
                        s, e), "hours",
                        "Median hours from approval to going live, for listings submitted in the window that passed through"
                                + " APPROVED before PUBLISHED (listings published directly on approval are excluded)."),
                m("publication.rejectedRate", "Rejected", pct(num(submitted
                                + " select count(*) from sub where exists (select 1 from opportunity_versions v where v.opportunity_id = sub.opportunity_id"
                                + " and v.status = 'ARCHIVED') and not exists (select 1 from opportunity_versions v where"
                                + " v.opportunity_id = sub.opportunity_id and v.status = 'PUBLISHED')", s, e), count), "percent",
                        "Submitted-in-window listings archived without ever being published ÷ listings submitted in the window."),
                m("publication.changesRequestedRate", "Changes requested", pct(num(submitted
                                + " select count(*) from sub where exists (select 1 from opportunity_versions v where v.opportunity_id = sub.opportunity_id"
                                + " and v.status = 'DRAFT' and v.created_at > sub.submitted_at)", s, e), count), "percent",
                        "Submitted-in-window listings sent back to the submitter at least once ÷ listings submitted in the window."),
                m("publication.expiredUnpublished", "Expired before publication",
                        num("select count(*) from opportunities where deadline >= ? and deadline < ? and published_at is null"
                                + " and status <> 'DRAFT'", s, e), "count",
                        "Submitted listings whose deadline fell in the window without them ever being published.")),
                List.of());
    }

    private Family funnel(Timestamp s, Timestamp e) {
        String apps = "from applications where submitted_at >= ? and submitted_at < ?";
        Double total = num("select count(*) " + apps, s, e);
        List<Metric> metrics = new ArrayList<>();
        metrics.add(m("funnel.applications", "Applications", total, "count",
                "EOZ-hosted applications submitted during the window."));
        for (String[] stage : new String[][] {{"SHORTLISTED", "Reached shortlist"}, {"INTERVIEW", "Reached interview"},
                {"OFFER", "Reached offer"}, {"HIRED", "Hired"}}) {
            metrics.add(m("funnel.reached." + stage[0].toLowerCase(), stage[1], pct(num(
                            "select count(*) from applications a where a.submitted_at >= ? and a.submitted_at < ? and (a.status = ?"
                                    + " or exists (select 1 from application_status_history h where h.application_id = a.id and h.to_status = ?))",
                            s, e, stage[0], stage[0]), total), "percent",
                    "Applications submitted in the window that have ever reached " + stage[0]
                            + " ÷ applications submitted in the window."));
        }
        metrics.add(m("funnel.daysToShortlist", "Median time to shortlist", num(
                        "select percentile_cont(0.5) within group (order by extract(epoch from (h.at - a.submitted_at)) / 86400)"
                                + " from applications a join lateral (select min(changed_at) at from application_status_history h"
                                + " where h.application_id = a.id and h.to_status = 'SHORTLISTED') h on h.at is not null"
                                + " where a.submitted_at >= ? and a.submitted_at < ?", s, e), "days",
                "Median days from submission to first SHORTLISTED, for applications submitted in the window."));
        metrics.add(m("funnel.daysToHire", "Median time to hire", num(
                        "select percentile_cont(0.5) within group (order by extract(epoch from (h.at - a.submitted_at)) / 86400)"
                                + " from applications a join lateral (select min(changed_at) at from application_status_history h"
                                + " where h.application_id = a.id and h.to_status = 'HIRED') h on h.at is not null"
                                + " where a.submitted_at >= ? and a.submitted_at < ?", s, e), "days",
                "Median days from submission to HIRED, for applications submitted in the window."));
        return new Family("funnel", "Recruitment funnel", metrics, List.of(
                new Breakdown("Applications by current stage", names("select status, count(*) " + apps + " group by status order by 2 desc", s, e)),
                new Breakdown("Recruitment-project candidates by stage (all open projects)", names(
                        "select p.stage, count(*) from pipeline_candidates p join recruitment_projects r on r.id = p.project_id"
                                + " where r.status = 'OPEN' group by p.stage order by 2 desc"))));
    }

    private Family employers(Timestamp s, Timestamp e) {
        Double active = num("select count(distinct organisation_id) from opportunities where organisation_id is not null"
                + " and published_at >= ? and published_at < ?", s, e);
        Double listings = num("select count(*) from opportunities where organisation_id is not null and published_at >= ?"
                + " and published_at < ?", s, e);
        Double due = num("select count(*) from opportunities where deadline >= ? and deadline < ? and published_at is not null", s, e);
        return new Family("employers", "Employer engagement", List.of(
                m("employers.verified", "Verified organisations",
                        num("select count(*) from organisations where verification_status = 'VERIFIED'"), "count",
                        "Organisations currently VERIFIED (a snapshot, not limited to the window)."),
                m("employers.new", "New organisations",
                        num("select count(*) from organisations where created_at >= ? and created_at < ?", s, e), "count",
                        "Organisation profiles created during the window."),
                m("employers.active", "Active organisations", active, "count",
                        "Organisations with at least one listing published during the window."),
                m("employers.listingsPerActive", "Listings per active organisation",
                        active == null || active == 0 ? null : round(listings / active), "ratio",
                        "Listings linked to an organisation and published in the window ÷ active organisations."),
                m("employers.renewalRate", "Renewal rate", pct(num(
                                "select count(distinct entity_id) from audit_events where action = 'RENEWED' and occurred_at >= ? and occurred_at < ?",
                                s, e), due), "percent",
                        "Listings renewed during the window ÷ published listings whose deadline fell in the window."),
                m("employers.serviceRequests", "Service requests from employers", num(
                                "select count(*) from service_orders o where o.created_at >= ? and o.created_at < ? and exists (select 1"
                                        + " from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = o.customer_id and r.name = 'EMPLOYER')",
                                s, e), "count",
                        "Service orders placed during the window by accounts with the employer role.")),
                List.of());
    }

    private Family services(Timestamp s, Timestamp e) {
        String orders = "from service_orders where created_at >= ? and created_at < ?";
        return new Family("services", "Service operations", List.of(
                m("services.orders", "Orders", num("select count(*) " + orders, s, e), "count",
                        "Service orders placed during the window."),
                m("services.turnaroundDays", "Median turnaround (completed)", num(
                                "select percentile_cont(0.5) within group (order by extract(epoch from (updated_at - created_at)) / 86400) "
                                        + orders + " and status = 'COMPLETED'", s, e), "days",
                        "Median days from order to its last update, for orders placed in the window and now COMPLETED."
                                + " The last update is normally the completion; later edits would lengthen it."),
                m("services.revisions", "Average revisions (completed)", num(
                                "select round(avg(revision_count)::numeric, 1) " + orders + " and status = 'COMPLETED'", s, e), "ratio",
                        "Mean revision rounds of orders placed in the window and now COMPLETED."),
                m("services.satisfaction", "Average satisfaction", num(
                                "select round(avg(rating)::numeric, 1) from service_orders where rated_at >= ? and rated_at < ?", s, e),
                        "rating", "Mean customer rating (1–5) given during the window."),
                m("services.recognised", "Invoiced (recognised)", num(
                                "select coalesce(sum(amount), 0) from invoices where issued_at >= ? and issued_at < ? and status <> 'CANCELLED'"
                                        + " and currency = 'ZMW'", s, e), "ZMW",
                        "Total of ZMW invoices issued during the window, excluding cancelled invoices. Revenue is recognised"
                                + " when invoiced."),
                m("services.received", "Received", num(
                                "select coalesce(sum(amount), 0) from invoices where paid_at >= ? and paid_at < ?"
                                        + " and currency = 'ZMW'", s, e), "ZMW",
                        "Total of ZMW invoices paid during the window (cash received), whenever they were issued; refunds made"
                                + " later are not deducted."),
                m("services.overdueInvoices", "Overdue invoices", num(
                                "select count(*) from invoices where status = 'UNPAID' and due_at < now()"), "count",
                        "Unpaid invoices past their due date right now (a snapshot).")),
                List.of(new Breakdown("Orders by status", names("select status, count(*) " + orders + " group by status order by 2 desc", s, e)),
                        new Breakdown("Orders by service", names(
                                "select p.name, count(*) from service_orders o join service_packages p on p.id = o.package_id"
                                        + " where o.created_at >= ? and o.created_at < ? group by p.name order by 2 desc", s, e))));
    }

    private Family dataQuality() {
        String live = "from opportunities where status = 'PUBLISHED'";
        return new Family("quality", "Data quality (right now)", List.of(
                m("quality.missingRoute", "Missing application route", num("select count(*) " + live
                                + " and ((application_mode = 'EXTERNAL_URL' and coalesce(application_url, '') = '')"
                                + " or (application_mode = 'EMPLOYER_EMAIL' and coalesce(application_email, '') = '')"
                                + " or (application_mode = 'PHYSICAL_ADDRESS' and coalesce(application_address, '') = ''))"), "count",
                        "Published listings whose application mode needs a link, email or address that is empty."),
                m("quality.noDeadline", "No deadline", num("select count(*) " + live + " and deadline is null"), "count",
                        "Published listings without a closing date."),
                m("quality.incomplete", "Thin descriptions", num("select count(*) " + live
                                + " and (length(coalesce(description, '')) < 80 or coalesce(requirements, '') = '')"), "count",
                        "Published listings with a description under 80 characters or no requirements."),
                m("quality.unverifiedSource", "Unverified source", num("select count(*) " + live + " and not coalesce(verified, false)"),
                        "count", "Published listings not marked as verified against their source."),
                m("quality.duplicates", "Possible duplicates", num(
                                "select count(*) from opportunities where flagged_duplicate_of is not null and status not in ('ARCHIVED')"),
                        "count", "Listings flagged as possible duplicates and not archived, awaiting a moderator's decision."),
                m("quality.pastDeadline", "Published past deadline", num("select count(*) " + live + " and deadline < now()"), "count",
                        "Published listings whose deadline has passed (the closing job should keep this at zero)."),
                m("quality.openFraudReports", "Unresolved fraud reports",
                        num("select count(*) from fraud_reports where status = 'OPEN'"), "count",
                        "Fraud or scam reports not yet resolved.")),
                List.of());
    }

    // ---------------------------------------------------------------- helpers

    private static Metric m(String key, String label, Double value, String unit, String definition) {
        return new Metric(key, label, value == null ? null : round(value), unit, definition);
    }

    private Double num(String sql, Object... args) {
        Number n = jdbc.queryForObject(sql, Number.class, args);
        return n == null ? null : n.doubleValue();
    }

    private List<NameCount> names(String sql, Object... args) {
        return jdbc.query(sql, (rs, i) -> new NameCount(rs.getString(1), rs.getLong(2)), args);
    }

    private static Double pct(Double numerator, Double denominator) {
        if (numerator == null || denominator == null || denominator == 0) return null;
        return round(numerator * 100 / denominator);
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
