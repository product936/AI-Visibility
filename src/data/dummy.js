export const kpis = [
  {
    key: 'visibility',
    label: 'AI Visibility Score',
    value: '67',
    suffix: '/100',
    delta: '+8',
    deltaDir: 'up',
    sub: 'Across 5 LLMs · 100 locations',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: 'eye',
  },
  {
    key: 'owned',
    label: 'Owned-Source Citation Rate',
    value: '34%',
    extra: '(50 sources)',
    delta: '+4%',
    deltaDir: 'up',
    sub: '50 of 148 unique sources',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: 'shield-check',
  },
  {
    key: 'gaps',
    label: 'High-Value Gaps',
    value: '15%',
    delta: '-3%',
    deltaDir: 'up',
    deltaTone: 'bad',
    sub: '5 critical gaps identified',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: 'alert-triangle',
  },
  {
    key: 'third',
    label: 'Third-Party Influence',
    value: '62%',
    delta: '+5%',
    deltaDir: 'down',
    deltaTone: 'bad',
    sub: 'Top: bankbazaar.com',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    icon: 'users',
  },
]

export const productCategories = [
  'All',
  'Deposits',
  'Cards',
  'Loans',
  'NRI',
  'Digital',
  'Travel',
  'Wealth',
  'Business',
]

export const llms = [
  { key: 'chatgpt', label: 'ChatGPT', emoji: '🍪' },
  { key: 'google', label: 'Google AI', emoji: '🔍' },
  { key: 'gemini', label: 'Gemini', emoji: '✨' },
  { key: 'perplexity', label: 'Perplexity', emoji: '🪐' },
  { key: 'claude', label: 'Claude', emoji: '🍑' },
]

export const productMatrix = [
  { product: 'Savings Account', category: 'Deposits', chatgpt: true, google: true, gemini: true, perplexity: false, claude: true, score: 80 },
  { product: 'Indulge Credit Card', category: 'Cards', chatgpt: true, google: false, gemini: true, perplexity: true, claude: false, score: 60 },
  { product: 'Personal Loan', category: 'Loans', chatgpt: true, google: true, gemini: false, perplexity: true, claude: true, score: 80 },
  { product: 'Home Loan', category: 'Loans', chatgpt: false, google: true, gemini: false, perplexity: false, claude: false, score: 20 },
  { product: 'NRI Banking (NRE/NRO)', category: 'NRI', chatgpt: true, google: true, gemini: true, perplexity: true, claude: true, score: 100 },
  { product: 'Fixed Deposit', category: 'Deposits', chatgpt: true, google: false, gemini: true, perplexity: true, claude: false, score: 60 },
  { product: 'IndusMobile App', category: 'Digital', chatgpt: false, google: false, gemini: true, perplexity: false, claude: false, score: 20 },
  { product: 'IndusForex Card', category: 'Travel', chatgpt: true, google: true, gemini: false, perplexity: false, claude: true, score: 60 },
  { product: 'PIONEER Wealth Mgmt', category: 'Wealth', chatgpt: false, google: false, gemini: false, perplexity: false, claude: false, score: 0 },
  { product: 'SME Business Loans', category: 'Business', chatgpt: true, google: false, gemini: true, perplexity: false, claude: false, score: 40 },
]

export const competitors = [
  { name: 'IndusInd Bank', isYou: true, cited: 41, delta: '+3%', deltaDir: 'up', icon: '🏦', tint: 'red' },
  { name: 'HDFC Bank', cited: 22, delta: '+2%', deltaDir: 'up', icon: '🏛️', tint: 'red' },
  { name: 'ICICI Bank', cited: 16, delta: '+1%', deltaDir: 'up', icon: '🟠', tint: 'orange' },
  { name: 'Axis Bank', cited: 10, delta: '-1%', deltaDir: 'down', icon: '🅰️', tint: 'purple' },
  { name: 'Kotak Bank', cited: 7, delta: '0%', deltaDir: 'flat', icon: '🔷', tint: 'blue' },
  { name: 'Yes Bank', cited: 4, delta: '-1%', deltaDir: 'down', icon: '✅', tint: 'blue' },
]

export const ownershipSplit = [
  { name: 'Owned', value: 34, color: '#2563eb' },
  { name: 'Competitor', value: 28, color: '#ef4444' },
  { name: 'Third-party', value: 38, color: '#64748b' },
]

export const sourceCategories = [
  { name: 'Aggregator', value: 42, color: '#3b82f6' },
  { name: 'News / Editorial', value: 31, color: '#8b5cf6' },
  { name: 'Forum / UGC', value: 24, color: '#f59e0b' },
  { name: 'Competitor', value: 19, color: '#ef4444' },
  { name: 'Owned', value: 18, color: '#10b981' },
  { name: 'Finance Portal', value: 14, color: '#06b6d4' },
]

export const topSources = [
  { rank: 1, source: 'bankbazaar.com', icon: '📊', category: 'Aggregator', ownership: 'Third-party', content: 'Organic', pos: '#1', freq: 92, share: 18, cites: true },
  { rank: 2, source: 'economictimes.com', icon: '📰', category: 'News', ownership: 'Third-party', content: 'Organic', pos: '#2', freq: 78, share: 14, cites: true },
  { rank: 3, source: 'indusind.com', icon: '🏦', category: 'Owned', ownership: 'Owned', content: 'Organic', pos: '#3', freq: 85, share: 13, cites: true },
  { rank: 4, source: 'reddit.com', icon: '👽', category: 'Forum/UGC', ownership: 'Third-party', content: 'Organic', pos: '#4', freq: 61, share: 11, cites: false },
  { rank: 5, source: 'paisabazaar.com', icon: '💸', category: 'Aggregator', ownership: 'Third-party', content: 'Paid', pos: '#5', freq: 55, share: 10, cites: true },
  { rank: 6, source: 'hdfcbank.com', icon: '🟥', category: 'Competitor', ownership: 'Competitor', content: 'Organic', pos: '#6', freq: 72, share: 9, cites: false },
  { rank: 7, source: 'moneycontrol.com', icon: '📈', category: 'News', ownership: 'Third-party', content: 'Organic', pos: '#7', freq: 48, share: 8, cites: true },
  { rank: 8, source: 'policybazaar.com', icon: '🛡️', category: 'Aggregator', ownership: 'Third-party', content: 'Paid', pos: '#8', freq: 44, share: 7, cites: false },
]

export const promptDetails = [
  { prompt: 'Best savings account interest rate in private bank India', citations: 7, sources: 6, indusindCited: true },
  { prompt: 'Best credit card for travel lounge access India 2025', citations: 5, sources: 4, indusindCited: false },
  { prompt: 'How to open NRI account in India online', citations: 9, sources: 7, indusindCited: true },
  { prompt: 'Personal loan interest rates comparison India 2025', citations: 6, sources: 5, indusindCited: true },
]

export const highValueGaps = [
  { topic: 'Home loan eligibility & EMI calculator', impact: 'High', missingFrom: ['ChatGPT', 'Gemini', 'Claude'], opportunity: '12K monthly AI queries' },
  { topic: 'PIONEER Wealth Management onboarding', impact: 'High', missingFrom: ['All LLMs'], opportunity: '4K monthly AI queries' },
  { topic: 'IndusMobile app features comparison', impact: 'Medium', missingFrom: ['ChatGPT', 'Perplexity', 'Claude'], opportunity: '8K monthly AI queries' },
  { topic: 'SME loan documentation requirements', impact: 'Medium', missingFrom: ['Google AI', 'Perplexity', 'Claude'], opportunity: '5K monthly AI queries' },
  { topic: 'Forex card vs credit card for travel', impact: 'Low', missingFrom: ['Gemini', 'Perplexity'], opportunity: '3K monthly AI queries' },
]
