// Single source of truth for company, product and pricing details.
// The website, the slide deck and the downloadable PDF brochure all read from here,
// so a price or address change only needs to be made once.

const company = {
  name: 'Dofida',
  legalName: 'Dofida Group',
  tagline: 'Software that grows with your nursery',
  serviceArea: 'all of Kerala and Karnataka',
  locations: [
    { city: 'Calicut', region: 'Kerala', note: 'Office' },
    { city: 'Hunsur', region: 'Karnataka', note: 'Office' },
  ],
  // Fill these in to show them on the site and in the brochure. Empty values are hidden.
  contact: {
    phone: process.env.CONTACT_PHONE || '',
    whatsapp: process.env.CONTACT_WHATSAPP || '',
    email: process.env.CONTACT_EMAIL || '',
  },
};

const pricing = {
  currency: 'INR',
  firstNursery: 20400,
  // Every additional nursery under the same owner gets 50% off the first-nursery price.
  additionalDiscountPercent: 50,
  get additionalNursery() {
    return Math.round(this.firstNursery * (1 - this.additionalDiscountPercent / 100));
  },
  // One subscription per owner, the same no matter how many nurseries they run.
  monthly: 199,
  includes: [
    'Plant Bill app licence (Android & iOS)',
    'Billing printer, included in the price',
    'Setup and onboarding with your plant list',
    'Training for you and your staff',
  ],
  monthlyIncludes: 'One flat monthly subscription covers all your nurseries',
};

const product = {
  name: 'Plant Bill',
  summary:
    'A billing app made for plant nurseries. Bill customers from your phone, print the receipt on the printer that comes in the box, and keep track of every sale.',
  platforms: ['Android', 'iOS'],
  features: [
    { title: 'Bill in seconds', text: 'Pick plants from your own catalogue, set quantities and print a clean bill while the customer waits.' },
    { title: 'Printer included', text: 'Every package ships with a billing printer that pairs with your phone, so receipts come out on the spot.' },
    { title: 'Android & iOS', text: 'Runs on the phones you and your staff already use, from budget Android handsets to iPhones.' },
    { title: 'Your plant catalogue', text: 'Add every variety you sell with its own price and size, then find it fast when billing.' },
    { title: 'Sales at a glance', text: 'See what sold today, this week and this month, and which plants bring in the most.' },
    { title: 'Many nurseries, one owner', text: 'Run several nurseries under one owner, with each extra nursery at half price.' },
  ],
  steps: [
    { title: 'Enquire', text: 'Send us an enquiry or call us. We will talk through how your nursery works.' },
    { title: 'Set up', text: 'We install Plant Bill on your phone, load your plant list and pair the printer.' },
    { title: 'Train', text: 'We show you and your staff how to bill, print and check sales.' },
    { title: 'Grow', text: 'Start billing. Add more nurseries any time at 50% off.' },
  ],
};

function formatINR(amount) {
  return amount.toLocaleString('en-IN');
}

module.exports = { company, pricing, product, formatINR };
