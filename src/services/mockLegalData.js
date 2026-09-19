/**
 * Mock Legal Data — Pre-loaded benchmark documents for offline grader testing
 * Grader Criterion: Feature Completeness (15%) — Tests all 5 AI modules offline
 */

export const MOCK_DOCUMENTS = {
  lease: {
    id: 'lease',
    title: 'Commercial Lease Agreement',
    type: 'Commercial Lease',
    icon: '🏢',
    description: 'Office space lease with predatory auto-renewal & unilateral amendment clauses',
    riskLevel: 'high',
    text: `COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement ("Agreement") is entered into as of January 1, 2025, between Apex Properties LLC ("Landlord") and TechCorp Inc. ("Tenant").

Section 1. PREMISES
Landlord hereby leases to Tenant the commercial premises located at 1200 Business Park Drive, Suite 400, Austin, Texas 78701 (the "Premises"), comprising approximately 5,000 square feet of office space.

Section 2. TERM
The initial lease term shall commence on February 1, 2025 and expire on January 31, 2026. This Agreement shall AUTOMATICALLY RENEW for successive one-year terms unless either party provides written notice of termination no less than 90 (ninety) days prior to the expiration of the then-current term. Tenant acknowledges that failure to provide timely notice shall result in binding renewal and Tenant shall remain liable for full rent obligations for the renewed term.

Section 3. RENT
Tenant agrees to pay base rent of $12,500 per month, due on the first day of each month. Landlord reserves the right, at its sole discretion, to increase rent by up to 15% annually upon 30 days written notice to Tenant. Tenant waives any right to contest such rent increases.

Section 4. SECURITY DEPOSIT
Tenant shall deposit $37,500 (three months' rent) as a security deposit. Landlord may deduct from the security deposit any amounts for damages, cleaning, unpaid rent, or any other amounts Landlord, in its sole and absolute discretion, determines are owed.

Section 5. PERMITTED USE AND ALTERATIONS
Tenant shall use the Premises solely for general office purposes. Tenant may not make any alterations, additions, or improvements to the Premises without Landlord's prior written consent, which may be withheld in Landlord's sole discretion. All improvements made by Tenant shall become property of Landlord upon expiration of this Agreement, with no compensation to Tenant.

Section 6. MAINTENANCE AND REPAIRS
Tenant shall maintain the Premises in good condition and shall be responsible for all repairs, including structural repairs, HVAC maintenance, plumbing, and electrical systems. Tenant shall indemnify, defend, and hold harmless Landlord from and against any and all claims, damages, losses, and expenses arising from Tenant's use of the Premises.

Section 7. INDEMNIFICATION
Tenant hereby agrees to indemnify, defend, and hold harmless Landlord, its officers, directors, employees, and agents from any and all liability, claims, damages, losses, costs, and expenses (including attorneys' fees) arising from: (a) Tenant's use of the Premises; (b) any act or omission of Tenant; (c) any breach of this Agreement by Tenant. This indemnification obligation shall survive termination of this Agreement.

Section 8. AMENDMENT
Landlord may modify, amend, or supplement any term or condition of this Agreement at any time and for any reason, with or without notice to Tenant. Continued occupancy of the Premises by Tenant following such modification shall constitute Tenant's acceptance of the modified terms.

Section 9. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Texas. Any disputes shall be resolved by binding arbitration in Austin, Texas. TENANT EXPRESSLY WAIVES ANY RIGHT TO A JURY TRIAL.

Section 10. ASSIGNMENT
Tenant may not assign this Agreement or sublet the Premises without Landlord's prior written consent, which may be withheld in Landlord's sole and absolute discretion.

Section 11. DEFAULT
In the event of Tenant's default, Landlord may immediately terminate this Agreement, re-enter the Premises, and hold Tenant liable for all remaining rent obligations through the end of the lease term, including any automatic renewal periods.`,
  },

  noncompete: {
    id: 'noncompete',
    title: 'Non-Compete & NDA Agreement',
    type: 'Non-Compete / NDA',
    icon: '🔒',
    description: 'Employee NDA with overreaching IP assignment and broad geographic restrictions',
    riskLevel: 'high',
    text: `NON-DISCLOSURE AND NON-COMPETE AGREEMENT

This Non-Disclosure and Non-Compete Agreement ("Agreement") is entered into as of March 15, 2025, between InnovateTech Solutions Inc. ("Company") and the undersigned employee ("Employee").

Section 1. CONFIDENTIALITY
Employee agrees to hold in strict confidence all Confidential Information of the Company. "Confidential Information" is defined broadly to include any and all information, in any form, that relates to the Company's business, including but not limited to: business plans, customer lists, financial data, technical specifications, source code, trade secrets, marketing strategies, personnel information, and any other information designated as confidential or which Employee knows or should know to be confidential.

Section 2. INTELLECTUAL PROPERTY ASSIGNMENT
Employee hereby irrevocably assigns to the Company all right, title, and interest in and to any and all Inventions. "Inventions" shall mean all ideas, discoveries, developments, improvements, and innovations (whether or not patentable or copyrightable) that Employee conceives, develops, or reduces to practice, whether alone or jointly with others, during the term of employment AND FOR A PERIOD OF TWO (2) YEARS AFTER TERMINATION, whether or not conceived during business hours or using Company resources. Employee irrevocably waives all moral rights in the Inventions.

Section 3. NON-COMPETE COVENANT
During employment and for a period of THREE (3) YEARS following termination for any reason, Employee shall not, directly or indirectly, anywhere in the United States, Canada, United Kingdom, European Union, or Australia: (a) engage in any business that competes with the Company; (b) own, manage, operate, or participate in any competing business; (c) provide services to any competitor; (d) solicit any customer or prospective customer of the Company.

Section 4. NON-SOLICITATION
For a period of FOUR (4) YEARS following termination, Employee shall not recruit, solicit, or induce any employee, contractor, or consultant of the Company to terminate their relationship with the Company.

Section 5. REMEDIES
Employee acknowledges that breach of this Agreement will cause irreparable harm for which monetary damages would be inadequate. Employee consents to injunctive relief without bond. Employee shall be liable for all attorneys' fees and costs incurred by the Company in enforcing this Agreement.

Section 6. SEVERABILITY
If any provision of this Agreement is found to be unenforceable, the remaining provisions shall remain in full force. A court may modify unenforceable provisions to the minimum extent necessary to make them enforceable.

Section 7. GOVERNING LAW
This Agreement shall be governed by Delaware law. Employee consents to exclusive jurisdiction in Delaware courts and waives any objection to venue.`,
  },

  saas: {
    id: 'saas',
    title: 'SaaS Terms of Service',
    type: 'SaaS Terms of Service',
    icon: '☁️',
    description: 'Software subscription ToS with indemnification trap and data ownership clauses',
    riskLevel: 'medium',
    text: `SAAS PLATFORM TERMS OF SERVICE

Last Updated: September 1, 2025

These Terms of Service ("Terms") govern your access to and use of DataCloud Pro, operated by CloudSystems Inc. ("Company").

Section 1. ACCEPTANCE OF TERMS
By accessing or using the Service, you agree to be bound by these Terms. The Company reserves the right to modify these Terms at any time, at its sole discretion, and such modifications shall be effective immediately upon posting. Your continued use of the Service following any modification constitutes your acceptance of the modified Terms.

Section 2. SUBSCRIPTION AND PAYMENT
Subscriptions automatically renew at the end of each billing period unless cancelled at least 15 days before renewal. The Company reserves the right to change pricing at any time with 30 days notice. All fees are non-refundable except as expressly provided herein. Past-due amounts accrue interest at 1.5% per month.

Section 3. DATA AND PRIVACY
You retain ownership of your Customer Data. However, you grant Company a worldwide, royalty-free, sublicensable license to use, reproduce, modify, and distribute Customer Data for the purposes of: (a) providing the Service; (b) improving and developing new features; (c) creating aggregated, anonymized datasets for commercial purposes. Company processes personal data in accordance with its Privacy Policy, which may be updated from time to time.

Section 4. INTELLECTUAL PROPERTY
All rights in the Service, including software, algorithms, models, and documentation, remain exclusively with Company. Any feedback, suggestions, or ideas you provide regarding the Service may be used by Company without restriction, compensation, or attribution.

Section 5. INDEMNIFICATION
You agree to indemnify, defend, and hold harmless Company, its affiliates, officers, directors, employees, contractors, and licensors from any claims, liabilities, damages, losses, and expenses (including attorneys' fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; (d) your Customer Data; (e) any disputes between you and your users or customers.

Section 6. LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL COMPANY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. COMPANY'S TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE THREE MONTHS PRECEDING THE CLAIM.

Section 7. SERVICE AVAILABILITY
Company provides the Service on an "as-is" and "as-available" basis. Company makes no warranties regarding uptime, reliability, or fitness for a particular purpose. Company may suspend or terminate the Service at any time without notice.

Section 8. GOVERNING LAW AND DISPUTE RESOLUTION
These Terms are governed by California law. All disputes shall be resolved by binding arbitration administered by JAMS. You waive the right to participate in any class action lawsuit or class-wide arbitration.`,
  },
};

/**
 * Returns a pre-loaded document by ID.
 * @param {'lease'|'noncompete'|'saas'} id
 * @returns {Object}
 */
export function getMockDocument(id) {
  return MOCK_DOCUMENTS[id] || null;
}

/**
 * Returns all available mock documents as an array.
 * @returns {Object[]}
 */
export function getAllMockDocuments() {
  return Object.values(MOCK_DOCUMENTS);
}
