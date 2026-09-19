/**
 * LexiGuard AI - User Authentication & Memory Storage Service
 */

const DEMO_USERS = [
  {
    id: 'user_sarah_01',
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberlegal.io',
    role: 'Senior Counsel',
    company: 'CyberLegal Tech',
    avatar: '👩‍⚖️',
    twoFactorEnabled: true,
    securityTier: '256-Bit Vault Secured',
  },
  {
    id: 'user_alex_02',
    name: 'Alex Mercer',
    email: 'alex.mercer@apexventures.com',
    role: 'Managing Director',
    company: 'Apex Ventures',
    avatar: '👨‍💼',
    twoFactorEnabled: true,
    securityTier: '256-Bit Vault Secured',
  },
  {
    id: 'user_elena_03',
    name: 'Elena Rostova',
    email: 'elena.r@legalai-labs.org',
    role: 'Chief Compliance Officer',
    company: 'LegalAI Labs',
    avatar: '👩‍💻',
    twoFactorEnabled: false,
    securityTier: 'Encrypted Vault',
  },
];

const SEED_MEMORIES = {
  user_sarah_01: [
    {
      id: 'mem_1',
      filename: 'Master_SaaS_Service_Agreement_v2.pdf',
      docType: 'pdf',
      pageCount: 14,
      savedAt: '2026-09-18T10:30:00.000Z',
      overallRiskScore: 78,
      riskLevel: 'HIGH RISK',
      riskCount: 4,
      eli5Summary: 'This agreement binds the company to a 3-year auto-renewing subscription with unlimited unilateral liability for data breaches.',
      riskHighlights: ['Auto-Renewal Trap (Section 14)', 'Uncapped Indemnification (Section 9.2)', 'Unilateral Price Increase (Section 4.1)'],
      sampleText: `ENTERPRISE SAAS SERVICES AGREEMENT\n\nSection 14. Term and Renewal: This Agreement shall automatically renew for successive 36-month periods unless written notice of non-renewal is provided 180 days prior to the expiration of the initial term.\nSection 9.2 Indemnification: Customer agrees to indemnify, defend, and hold harmless Service Provider against any and all claims, damages, liabilities, losses, costs, and expenses (including attorneys' fees) arising out of or related to Customer's use of the Platform.`
    },
    {
      id: 'mem_2',
      filename: 'Commercial_Office_Lease_Suite400.docx',
      docType: 'docx',
      pageCount: 8,
      savedAt: '2026-09-15T14:15:00.000Z',
      overallRiskScore: 45,
      riskLevel: 'MEDIUM RISK',
      riskCount: 2,
      eli5Summary: 'Standard commercial lease with a personal guarantee clause and tenant responsible for building HVAC repairs over $5,000.',
      riskHighlights: ['Personal Liability Guarantee (Section 22)', 'HVAC Repair Allocation (Section 11)'],
      sampleText: `COMMERCIAL LEASE AGREEMENT\n\nSection 22. Personal Guarantee: The undersigned Guarantor unconditionally and irrevocably guarantees the payment of all rent and performance of all tenant obligations under this lease.`
    }
  ],
  user_alex_02: [
    {
      id: 'mem_3',
      filename: 'Series_A_Term_Sheet_Apex.pdf',
      docType: 'pdf',
      pageCount: 6,
      savedAt: '2026-09-17T16:45:00.000Z',
      overallRiskScore: 62,
      riskLevel: 'MEDIUM RISK',
      riskCount: 3,
      eli5Summary: 'Term sheet featuring 2x Participating Preferred liquidation preference and broad board consent drag-along rights.',
      riskHighlights: ['2x Participating Preferred (Section 4)', 'Full Ratchet Anti-Dilution (Section 6)'],
      sampleText: `SERIES A PREFERRED STOCK TERM SHEET\n\nSection 4. Liquidation Preference: In the event of any liquidation, dissolution, or winding up, Series A Preferred shall receive 2.0x original purchase price prior to common distributions.`
    }
  ],
  user_elena_03: []
};

// Storage Keys
const KEY_ACTIVE_USER = 'lexiguard_active_user';
const KEY_CUSTOM_USERS = 'lexiguard_custom_users';
const KEY_USER_MEMORIES = (userId) => `lexiguard_memories_${userId}`;

export const authService = {
  getDemoUsers() {
    return DEMO_USERS;
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(KEY_ACTIVE_USER);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error reading active user:', e);
    }
    // Default to first demo user if none active
    return DEMO_USERS[0];
  },

  setCurrentUser(user) {
    try {
      localStorage.setItem(KEY_ACTIVE_USER, JSON.stringify(user));
      // Initialize seed memories if user has no memories stored
      const existing = localStorage.getItem(KEY_USER_MEMORIES(user.id));
      if (!existing && SEED_MEMORIES[user.id]) {
        localStorage.setItem(KEY_USER_MEMORIES(user.id), JSON.stringify(SEED_MEMORIES[user.id]));
      }
    } catch (e) {
      console.error('Error setting current user:', e);
    }
  },

  logout() {
    try {
      localStorage.removeItem(KEY_ACTIVE_USER);
    } catch (e) {
      console.error('Error clearing user session:', e);
    }
  },

  login(email, password) {
    const trimmed = (email || '').toLowerCase().trim();
    
    // Check demo users
    const demo = DEMO_USERS.find(u => u.email.toLowerCase() === trimmed);
    if (demo) {
      this.setCurrentUser(demo);
      return { success: true, user: demo, token: `token_${Date.now()}_${demo.id}` };
    }

    // Check custom registered users
    let customUsers = [];
    try {
      const raw = localStorage.getItem(KEY_CUSTOM_USERS);
      if (raw) customUsers = JSON.parse(raw);
    } catch (e) {}

    const custom = customUsers.find(u => u.email.toLowerCase() === trimmed);
    if (custom) {
      this.setCurrentUser(custom);
      return { success: true, user: custom, token: `token_${Date.now()}_${custom.id}` };
    }

    // Allow login if email is provided (auto-create demo account for any new email)
    if (trimmed) {
      const newUser = {
        id: `user_${Date.now()}`,
        name: trimmed.split('@')[0].replace('.', ' ').toUpperCase(),
        email: trimmed,
        role: 'Legal Professional',
        company: 'Private Vault',
        avatar: '🛡️',
        twoFactorEnabled: true,
        securityTier: '256-Bit Vault Secured'
      };
      customUsers.push(newUser);
      try {
        localStorage.setItem(KEY_CUSTOM_USERS, JSON.stringify(customUsers));
      } catch (e) {}
      this.setCurrentUser(newUser);
      return { success: true, user: newUser, token: `token_${Date.now()}_${newUser.id}` };
    }

    return { success: false, error: 'Invalid email address or vault credentials.' };
  },

  signup(name, email, role, company) {
    const trimmed = (email || '').toLowerCase().trim();
    if (!trimmed || !name) {
      return { success: false, error: 'Please provide full name and email.' };
    }

    let customUsers = [];
    try {
      const raw = localStorage.getItem(KEY_CUSTOM_USERS);
      if (raw) customUsers = JSON.parse(raw);
    } catch (e) {}

    const newUser = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: trimmed,
      role: role || 'Legal Professional',
      company: company || 'Private Vault',
      avatar: '⚖️',
      twoFactorEnabled: true,
      securityTier: '256-Bit Vault Secured'
    };

    customUsers.push(newUser);
    try {
      localStorage.setItem(KEY_CUSTOM_USERS, JSON.stringify(customUsers));
    } catch (e) {}

    this.setCurrentUser(newUser);
    return { success: true, user: newUser, token: `token_${Date.now()}_${newUser.id}` };
  },

  getSavedMemories(userId) {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(KEY_USER_MEMORIES(userId));
      if (stored) return JSON.parse(stored);
      if (SEED_MEMORIES[userId]) return SEED_MEMORIES[userId];
    } catch (e) {
      console.error('Error reading saved memories:', e);
    }
    return [];
  },

  saveMemory(userId, memoryItem) {
    if (!userId) return false;
    try {
      const memories = this.getSavedMemories(userId);
      const newMemory = {
        id: `mem_${Date.now()}`,
        savedAt: new Date().toISOString(),
        ...memoryItem
      };
      const updated = [newMemory, ...memories.filter(m => m.filename !== memoryItem.filename)];
      localStorage.setItem(KEY_USER_MEMORIES(userId), JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error saving memory item:', e);
      return false;
    }
  },

  deleteMemory(userId, memoryId) {
    if (!userId || !memoryId) return false;
    try {
      const memories = this.getSavedMemories(userId);
      const updated = memories.filter(m => m.id !== memoryId);
      localStorage.setItem(KEY_USER_MEMORIES(userId), JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error deleting memory item:', e);
      return false;
    }
  }
};
