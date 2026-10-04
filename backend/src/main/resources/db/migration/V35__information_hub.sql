-- Long-form, staff-managed guidance for the public Information Hub.

CREATE TABLE information_articles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(190) NOT NULL UNIQUE,
    title         VARCHAR(180) NOT NULL,
    excerpt       VARCHAR(360) NOT NULL,
    body          TEXT NOT NULL,
    category      VARCHAR(40) NOT NULL CHECK (category IN (
                      'OPPORTUNITY_GUIDES', 'APPLICATION_ADVICE', 'CAREER_GROWTH',
                      'WORKPLACE', 'BUSINESS', 'TRUST_SAFETY')),
    featured      BOOLEAN NOT NULL DEFAULT FALSE,
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    source_name   VARCHAR(160),
    source_url    VARCHAR(1000),
    created_by    UUID REFERENCES users(id),
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_information_articles_public
    ON information_articles(status, featured DESC, published_at DESC);
CREATE INDEX idx_information_articles_category
    ON information_articles(category, status);

INSERT INTO information_articles
    (slug, title, excerpt, body, category, featured, status, created_by, published_at)
VALUES
    (
        'a-strong-application-before-you-press-send',
        'A strong application, before you press send',
        'A practical final check for your CV, cover letter and supporting documents.',
        E'Start with the instructions. Read the opportunity once for context, then again with a checklist. Confirm the closing date, eligibility, required documents and the official submission route.\n\nTailor your CV to the role. Put the most relevant experience, skills and results near the top. Replace general claims with evidence: what you did, how you did it and what changed because of your work.\n\nKeep your cover letter focused. Explain why this opportunity fits your direction, show that you understand the organisation, and connect two or three requirements to real examples from your experience.\n\nName files clearly, use a professional email address and open every attachment before sending. Submit early enough to recover from a slow connection or a portal error. Keep a copy of the advert and your final application for interview preparation.',
        'APPLICATION_ADVICE', TRUE, 'PUBLISHED',
        '00000000-0000-0000-0000-000000000001', now() - interval '2 days'
    ),
    (
        'how-to-check-an-opportunity-before-you-apply',
        'How to check an opportunity before you apply',
        'Simple checks that help you separate a genuine opening from a costly scam.',
        E'Check the organisation independently. Search for its official website, verified social pages, physical address and public contact details. Do not rely only on the phone number or link inside a forwarded message.\n\nCompare the application route with the organisation''s official channels. Look carefully for misspelled domains, newly created pages and email addresses that imitate a known employer.\n\nBe cautious when anyone asks for money to release an application form, guarantee a shortlist, arrange an interview or secure a job. Genuine recruitment should explain every legitimate fee openly and through an official payment channel.\n\nProtect your identity documents. Share only what the application genuinely requires, and avoid sending banking PINs, passwords or one-time codes. If something feels wrong, pause and verify before continuing.',
        'TRUST_SAFETY', FALSE, 'PUBLISHED',
        '00000000-0000-0000-0000-000000000001', now() - interval '5 days'
    ),
    (
        'turning-your-experience-into-cv-achievements',
        'Turning your experience into CV achievements',
        'A simple way to write experience that shows contribution, not just duties.',
        E'A duty tells a recruiter what your position involved. An achievement shows how well you did it. Start with a strong action, add the task or problem, then describe the result.\n\nInstead of writing “responsible for customer records”, try “organised and digitised 600 customer records, reducing weekly retrieval time for the service team”. The useful detail is the scale, improvement or outcome.\n\nYou can find evidence even when your work was not measured formally. Think about volume handled, time saved, errors reduced, people supported, deadlines met, revenue protected or processes improved. Use honest estimates only when you can explain them.\n\nChoose three to five bullets for each recent role. Put the achievements most relevant to the opportunity first, and keep the wording direct enough to scan quickly.',
        'CAREER_GROWTH', FALSE, 'PUBLISHED',
        '00000000-0000-0000-0000-000000000001', now() - interval '8 days'
    );
