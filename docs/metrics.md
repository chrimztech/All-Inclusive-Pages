# Metric definitions

Generated from `backend/src/main/java/zm/eoz/platform/reporting/MetricsService.java` by `python scripts/gen-metrics-doc.py`; rerun it when a definition changes. The same text is shown next to each figure under **Admin → Reports**.

**Reporting window:** whole days in Africa/Lusaka time, from 00:00 on the start date up to (not including) 00:00 after the end date. The default is the last 30 days, and the maximum is one year. Metrics marked *(snapshot)* describe the current state and ignore the window.

**Privacy:** no metric breaks candidates down by personal characteristics (sex, age, disability and so on), so no small groups of candidates can be singled out.

## Opportunity reach

| Metric | Unit | Definition |
|---|---|---|
| Listings published | count | Listings whose first publication time falls in the window. |
| Total views | count | Sum of detail-page views, to date, of listings published in the window. Unique visitors are not tracked (no visitor identifiers are stored), so there is no unique-views figure. |
| External application clicks | count | Sum of clicks on the official application link or email, to date, of listings published in the window. |
| Click-through rate | percent | External application clicks ÷ total views, for listings published in the window. |
| Shares | count | Sum of share-button uses, to date, of listings published in the window. |
| Saves | count | Times any listing was saved by a candidate during the window. |
| Alert deliveries | count | Listings delivered to candidates through job alerts during the window (one per listing per alert). |

## Publication efficiency

| Metric | Unit | Definition |
|---|---|---|
| Submitted for review | count | Listings first sent to moderation (first PENDING_REVIEW) during the window. |
| Median time to approval | hours | Median hours from first submission to first approval (APPROVED, SCHEDULED or PUBLISHED), for listings submitted in the window that have been approved. Includes time spent with the submitter after a change request. |
| Median approval-to-publication time | hours | Median hours from approval to going live, for listings submitted in the window that passed through APPROVED before PUBLISHED (listings published directly on approval are excluded). |
| Rejected | percent | Submitted-in-window listings archived without ever being published ÷ listings submitted in the window. |
| Changes requested | percent | Submitted-in-window listings sent back to the submitter at least once ÷ listings submitted in the window. |
| Expired before publication | count | Submitted listings whose deadline fell in the window without them ever being published. |

## Recruitment funnel

| Metric | Unit | Definition |
|---|---|---|
| Applications | count | EOZ-hosted applications submitted during the window. |
| Reached shortlist | percent | Applications submitted in the window that have ever reached SHORTLISTED ÷ applications submitted in the window. |
| Reached interview | percent | Applications submitted in the window that have ever reached INTERVIEW ÷ applications submitted in the window. |
| Reached offer | percent | Applications submitted in the window that have ever reached OFFER ÷ applications submitted in the window. |
| Hired | percent | Applications submitted in the window that have ever reached HIRED ÷ applications submitted in the window. |
| Median time to shortlist | days | Median days from submission to first SHORTLISTED, for applications submitted in the window. |
| Median time to hire | days | Median days from submission to HIRED, for applications submitted in the window. |

## Employer engagement

| Metric | Unit | Definition |
|---|---|---|
| Verified organisations *(snapshot)* | count | Organisations currently VERIFIED (a snapshot, not limited to the window). |
| New organisations | count | Organisation profiles created during the window. |
| Active organisations | count | Organisations with at least one listing published during the window. |
| Listings per active organisation | ratio | Listings linked to an organisation and published in the window ÷ active organisations. |
| Renewal rate | percent | Listings renewed during the window ÷ published listings whose deadline fell in the window. |
| Service requests from employers | count | Service orders placed during the window by accounts with the employer role. |

## Service operations

| Metric | Unit | Definition |
|---|---|---|
| Orders | count | Service orders placed during the window. |
| Median turnaround (completed) | days | Median days from order to its last update, for orders placed in the window and now COMPLETED. The last update is normally the completion; later edits would lengthen it. |
| Average revisions (completed) | ratio | Mean revision rounds of orders placed in the window and now COMPLETED. |
| Average satisfaction | rating | Mean customer rating (1–5) given during the window. |
| Invoiced (recognised) | ZMW | Total of ZMW invoices issued during the window, excluding cancelled invoices. Revenue is recognised when invoiced. |
| Received | ZMW | Total of ZMW invoices paid during the window (cash received), whenever they were issued; refunds made later are not deducted. |
| Overdue invoices *(snapshot)* | count | Unpaid invoices past their due date right now (a snapshot). |

## Data quality (right now)

| Metric | Unit | Definition |
|---|---|---|
| Missing application route *(snapshot)* | count | Published listings whose application mode needs a link, email or address that is empty. |
| No deadline *(snapshot)* | count | Published listings without a closing date. |
| Thin descriptions *(snapshot)* | count | Published listings with a description under 80 characters or no requirements. |
| Unverified source *(snapshot)* | count | Published listings not marked as verified against their source. |
| Possible duplicates *(snapshot)* | count | Listings flagged as possible duplicates and not archived, awaiting a moderator's decision. |
| Published past deadline *(snapshot)* | count | Published listings whose deadline has passed (the closing job should keep this at zero). |
| Unresolved fraud reports *(snapshot)* | count | Fraud or scam reports not yet resolved. |
