import { usePrefs } from '../store/Prefs'

/**
 * Lightweight i18n. Strings are keyed with dot-namespaces; missing Hindi keys
 * fall back to English, and unknown keys fall back to the key itself so nothing
 * ever renders blank. `t(key, vars)` interpolates {placeholders}.
 *
 * Scope: the customer-facing chrome and marketing surfaces (header, bottom nav,
 * footer, home, help). The owner/admin panel stays in English.
 */

const EN = {
  // --- Header / nav ---
  'nav.home': 'Home',
  'nav.book': 'Book',
  'nav.mybookings': 'My bookings',
  'nav.help': 'Help',
  'nav.account': 'Account',
  'cta.login': 'Login',
  'menu.language': 'Language',
  'menu.appearance': 'Appearance',
  'menu.currently': 'Currently {x}',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'menu.notifications': 'Notifications',
  'menu.notifEmpty': 'Nothing yet. Your bookings will show up here.',
  'menu.adminDashboard': 'Admin dashboard',
  'menu.ownerDashboard': 'Owner dashboard',
  'menu.wallet': 'Wallet',
  'menu.account': 'Account',
  'menu.logout': 'Log out',
  'city.searchPlaceholder': 'Search city or PIN code',
  'city.useLocation': 'Use my current location',
  'city.detecting': 'Detecting…',
  'city.searching': 'Searching…',
  'city.noMatches': 'No matches',

  // --- Home ---
  'home.tagline': 'Book Your Appointment, Skip The Wait',
  'home.chooseTitle': 'Choose Your Salon',
  'home.chooseLede':
    'Select your preferred salon experience for tailored services & expert care in {city}.',
  'home.offerStrong': '10% off',
  'home.offerRest': 'your first booking when you pay online',
  'home.explore': 'Explore →',
  'home.featured': 'Featured services',
  'home.bookNow': 'Book now →',
  'home.topRated': 'Top rated',
  'home.salonsIn': 'Salons in {city}',
  'home.viewAll': 'View all {n}',
  'home.comingSoonTitle': 'Coming soon in {city}',
  'home.comingSoonText': 'We’re onboarding great salons near you — check back soon.',
  'home.howItWorks': 'How it works',
  'home.threeSteps': 'Three steps, sixty seconds',
  'home.testimonials': 'Testimonials',
  'home.whatMembersSay': 'What members say',
  'home.faqTitle': 'Frequently asked',
  'card.from': 'from',
  'card.reviews': 'reviews',
  'card.atSalon': 'At salon',
  'card.homeService': 'Home service',
  'card.openTill': 'Open till {t}',

  // --- Categories ---
  'cat.mens.label': "Men's Salon",
  'cat.mens.blurb': 'Grooming, haircuts, beard styling & facials for men',
  'cat.unisex.label': 'Unisex Salon',
  'cat.unisex.blurb': 'Hair, skin & beauty services for everyone',
  'cat.parlour.label': 'Beauty Parlour',
  'cat.parlour.blurb': 'Facials, waxing, manicure, pedicure, skincare & bridal makeup',

  // --- Steps ---
  'step.1.title': 'Choose your salon',
  'step.1.body': 'Pick a men’s salon, unisex salon or beauty parlour near you.',
  'step.2.title': 'Pick service & slot',
  'step.2.body': 'At the salon or at your home — whichever the salon offers.',
  'step.3.title': 'Confirm with OTP',
  'step.3.body': 'One code and your slot is held. No calls, no waiting.',

  // --- Testimonials ---
  'tst.1.quote':
    'Booked a haircut on the way home and walked straight into the chair. No waiting at all.',
  'tst.1.meta': 'Lucknow · 31 bookings',
  'tst.2.quote':
    'Home service for my mother’s facial was seamless. The beautician arrived exactly on time.',
  'tst.2.meta': 'Lucknow · 12 bookings',
  'tst.3.quote': 'Cancelled once and the refund hit my wallet instantly. Used it the same week.',
  'tst.3.meta': 'Delhi NCR · 26 bookings',

  // --- FAQ ---
  'faq.1.q': 'Do I pay online or at the salon?',
  'faq.1.a':
    'Both work. Pay online and get 10% off your very first booking, or choose to pay cash at the salon — the booking is confirmed either way.',
  'faq.2.q': 'Is the 10% discount available every time?',
  'faq.2.a':
    'No. It applies once, on your first ever booking, and only when you pay online. From your second booking onwards the full amount applies.',
  'faq.3.q': 'Can I get the service at home?',
  'faq.3.a':
    'Wherever the salon offers it. Each salon decides whether it does home service, and you will see a Home service option on its page when available.',
  'faq.4.q': 'How do refunds work if I cancel?',
  'faq.4.a':
    'Choose SalonSaathi Wallet for an instant credit, or send it back to your UPI or bank account, which takes 2–3 working days. Cash bookings have nothing to refund.',
  'faq.5.q': 'How to list your salon?',
  'faq.5.a':
    'Contact our support team. After verification, we will register your number and you can login at salonsaathi.in and list your salon.\n\n' +
    'Need Help?\nFor any assistance, simply contact the SalonSaathi Team.\n' +
    'Email: supportsalonsaathi@gmail.com\nPhone: 7081126830',

  // --- Footer ---
  'ftr.menu': 'Menu',
  'ftr.book': 'Book',
  'ftr.forSalons': 'For salons',
  'ftr.company': 'Company',
  'ftr.allSalons': 'All salons',
  'ftr.myBookings': 'My bookings',
  'ftr.wallet': 'Wallet',
  'ftr.listSalon': 'List your salon',
  'ftr.ownerDashboard': 'Owner dashboard',
  'ftr.admin': 'Admin',
  'ftr.helpCentre': 'Help centre',
  'ftr.about': 'About Us',
  'ftr.contact': 'Contact Us',
  'ftr.refund': 'Refund Policy',
  'ftr.privacy': 'Privacy Policy',
  'ftr.terms': 'Terms & Conditions',
  'trust.1': 'Certified professionals',
  'trust.2': 'Premium products',
  'trust.3': 'Luxury experience',

  // --- Help ---
  'help.title': 'Help & support',
  'help.lede': 'Everything about booking, paying and cancelling on {brand}.',
  'help.howPayment': 'How payment works',
  'help.payOnline': 'Pay online',
  'help.payOnlineBody':
    'Settled to {brand} at the time of booking. Your first booking gets {pct}% off — once per customer, never on repeat bookings.',
  'help.payAtSalon': 'Pay at salon',
  'help.payAtSalonBody':
    'Cash goes directly to the salon. The booking still records the amount so both you and the salon have a record of it.',
  'help.commission': 'Commission',
  'help.commissionFree': 'Salons keep 100% of the service price. There is no platform commission today.',
  'help.commissionRate': 'Salons keep {pct}% of the service price.',
  'help.needHelp': 'Need help? Chat with us',
  'help.waText': 'Message our support team on WhatsApp — we usually reply within a few minutes.',
  'help.waBtn': 'Chat on WhatsApp',
  'help.commonQuestions': 'Common questions',

  // --- Support chat (Help page) ---
  'chat.title': 'SalonSaathi Assistant',
  'chat.subtitle': 'Ask a common question or reach the team',
  'chat.greeting': 'Hi! 👋 How can we help you today? Pick a question below.',
  'chat.escalate': 'Still need help? Reach our team directly:',
  'chat.whatsapp': 'WhatsApp us',
  'chat.call': 'Call us',
  'chat.email': 'Email us',
  'chat.back': 'Ask another question',
  'chat.you': 'You',
}

const HI = {
  // --- Header / nav ---
  'nav.home': 'होम',
  'nav.book': 'बुक',
  'nav.mybookings': 'मेरी बुकिंग',
  'nav.help': 'मदद',
  'nav.account': 'अकाउंट',
  'cta.login': 'लॉगिन',
  'menu.language': 'भाषा',
  'menu.appearance': 'दिखावट',
  'menu.currently': 'अभी {x}',
  'theme.light': 'लाइट',
  'theme.dark': 'डार्क',
  'theme.system': 'सिस्टम',
  'menu.notifications': 'सूचनाएं',
  'menu.notifEmpty': 'अभी कुछ नहीं। आपकी बुकिंग यहाँ दिखेगी।',
  'menu.adminDashboard': 'एडमिन डैशबोर्ड',
  'menu.ownerDashboard': 'ओनर डैशबोर्ड',
  'menu.wallet': 'वॉलेट',
  'menu.account': 'अकाउंट',
  'menu.logout': 'लॉग आउट',
  'city.searchPlaceholder': 'शहर या पिन कोड खोजें',
  'city.useLocation': 'मेरी वर्तमान लोकेशन इस्तेमाल करें',
  'city.detecting': 'पता लगाया जा रहा…',
  'city.searching': 'खोज रहे…',
  'city.noMatches': 'कोई मिलान नहीं',

  // --- Home ---
  'home.tagline': 'अपना अपॉइंटमेंट बुक करें, इंतज़ार छोड़ें',
  'home.chooseTitle': 'अपना सैलून चुनें',
  'home.chooseLede':
    '{city} में अनुकूल सेवाओं और विशेषज्ञ देखभाल के लिए अपना पसंदीदा सैलून अनुभव चुनें।',
  'home.offerStrong': '10% छूट',
  'home.offerRest': 'ऑनलाइन भुगतान करने पर आपकी पहली बुकिंग पर',
  'home.explore': 'देखें →',
  'home.featured': 'विशेष सेवाएं',
  'home.bookNow': 'अभी बुक करें →',
  'home.topRated': 'टॉप रेटेड',
  'home.salonsIn': '{city} में सैलून',
  'home.viewAll': 'सभी {n} देखें',
  'home.comingSoonTitle': '{city} में जल्द आ रहा है',
  'home.comingSoonText': 'हम आपके पास बेहतरीन सैलून जोड़ रहे हैं — जल्द ही देखें।',
  'home.howItWorks': 'यह कैसे काम करता है',
  'home.threeSteps': 'तीन कदम, साठ सेकंड',
  'home.testimonials': 'प्रशंसापत्र',
  'home.whatMembersSay': 'सदस्य क्या कहते हैं',
  'home.faqTitle': 'अक्सर पूछे जाने वाले प्रश्न',
  'card.from': 'से',
  'card.reviews': 'समीक्षाएं',
  'card.atSalon': 'सैलून पर',
  'card.homeService': 'होम सर्विस',
  'card.openTill': '{t} तक खुला',

  // --- Categories ---
  'cat.mens.label': 'पुरुष सैलून',
  'cat.mens.blurb': 'पुरुषों के लिए ग्रूमिंग, हेयरकट, बियर्ड स्टाइलिंग और फेशियल',
  'cat.unisex.label': 'यूनिसेक्स सैलून',
  'cat.unisex.blurb': 'सभी के लिए हेयर, स्किन और ब्यूटी सेवाएं',
  'cat.parlour.label': 'ब्यूटी पार्लर',
  'cat.parlour.blurb': 'फेशियल, वैक्सिंग, मैनीक्योर, पेडीक्योर, स्किनकेयर और ब्राइडल मेकअप',

  // --- Steps ---
  'step.1.title': 'अपना सैलून चुनें',
  'step.1.body': 'अपने पास पुरुष सैलून, यूनिसेक्स सैलून या ब्यूटी पार्लर चुनें।',
  'step.2.title': 'सेवा और समय चुनें',
  'step.2.body': 'सैलून पर या आपके घर पर — जो भी सैलून प्रदान करता है।',
  'step.3.title': 'OTP से पुष्टि करें',
  'step.3.body': 'एक कोड और आपका स्लॉट सुरक्षित। कोई कॉल नहीं, कोई इंतज़ार नहीं।',

  // --- Testimonials ---
  'tst.1.quote': 'घर जाते समय हेयरकट बुक किया और सीधे कुर्सी पर बैठ गया। बिल्कुल इंतज़ार नहीं।',
  'tst.1.meta': 'लखनऊ · 31 बुकिंग',
  'tst.2.quote': 'मेरी माँ के फेशियल के लिए होम सर्विस बेहतरीन रही। ब्यूटीशियन बिल्कुल समय पर पहुँचीं।',
  'tst.2.meta': 'लखनऊ · 12 बुकिंग',
  'tst.3.quote': 'एक बार रद्द किया और रिफंड तुरंत मेरे वॉलेट में आ गया। उसी हफ्ते इस्तेमाल किया।',
  'tst.3.meta': 'दिल्ली एनसीआर · 26 बुकिंग',

  // --- FAQ ---
  'faq.1.q': 'क्या मैं ऑनलाइन भुगतान करूँ या सैलून पर?',
  'faq.1.a':
    'दोनों तरीके ठीक हैं। ऑनलाइन भुगतान करें और अपनी पहली बुकिंग पर 10% छूट पाएं, या सैलून पर नकद भुगतान चुनें — बुकिंग दोनों ही तरह से पक्की होती है।',
  'faq.2.q': 'क्या 10% छूट हर बार मिलती है?',
  'faq.2.a':
    'नहीं। यह केवल एक बार, आपकी पहली बुकिंग पर और सिर्फ ऑनलाइन भुगतान पर लागू होती है। दूसरी बुकिंग से पूरी राशि लागू होती है।',
  'faq.3.q': 'क्या मुझे घर पर सेवा मिल सकती है?',
  'faq.3.a':
    'जहाँ सैलून यह सुविधा देता है। हर सैलून तय करता है कि वह होम सर्विस देता है या नहीं, और उपलब्ध होने पर आपको उसके पेज पर होम सर्विस विकल्प दिखेगा।',
  'faq.4.q': 'रद्द करने पर रिफंड कैसे मिलता है?',
  'faq.4.a':
    'तुरंत क्रेडिट के लिए SalonSaathi वॉलेट चुनें, या इसे अपने UPI या बैंक खाते में वापस भेजें, जिसमें 2–3 कार्यदिवस लगते हैं। नकद बुकिंग में रिफंड के लिए कुछ नहीं होता।',
  'faq.5.q': 'अपना सैलून कैसे सूचीबद्ध करें?',
  'faq.5.a':
    'हमारी सहायता टीम से संपर्क करें। सत्यापन के बाद, हम आपका नंबर पंजीकृत करेंगे और आप salonsaathi.in पर लॉगिन करके अपना सैलून सूचीबद्ध कर सकते हैं।\n\n' +
    'मदद चाहिए?\nकिसी भी सहायता के लिए, बस SalonSaathi टीम से संपर्क करें।\n' +
    'ईमेल: supportsalonsaathi@gmail.com\nफ़ोन: 7081126830',

  // --- Footer ---
  'ftr.menu': 'मेन्यू',
  'ftr.book': 'बुक',
  'ftr.forSalons': 'सैलून के लिए',
  'ftr.company': 'कंपनी',
  'ftr.allSalons': 'सभी सैलून',
  'ftr.myBookings': 'मेरी बुकिंग',
  'ftr.wallet': 'वॉलेट',
  'ftr.listSalon': 'अपना सैलून जोड़ें',
  'ftr.ownerDashboard': 'ओनर डैशबोर्ड',
  'ftr.admin': 'एडमिन',
  'ftr.helpCentre': 'सहायता केंद्र',
  'ftr.about': 'हमारे बारे में',
  'ftr.contact': 'संपर्क करें',
  'ftr.refund': 'रिफंड नीति',
  'ftr.privacy': 'गोपनीयता नीति',
  'ftr.terms': 'नियम और शर्तें',
  'trust.1': 'प्रमाणित पेशेवर',
  'trust.2': 'प्रीमियम उत्पाद',
  'trust.3': 'लक्ज़री अनुभव',

  // --- Help ---
  'help.title': 'सहायता और समर्थन',
  'help.lede': '{brand} पर बुकिंग, भुगतान और रद्द करने से जुड़ी हर जानकारी।',
  'help.howPayment': 'भुगतान कैसे काम करता है',
  'help.payOnline': 'ऑनलाइन भुगतान',
  'help.payOnlineBody':
    'बुकिंग के समय {brand} को भुगतान होता है। आपकी पहली बुकिंग पर {pct}% छूट — प्रति ग्राहक एक बार, दोबारा बुकिंग पर नहीं।',
  'help.payAtSalon': 'सैलून पर भुगतान',
  'help.payAtSalonBody':
    'नकद सीधे सैलून को जाता है। बुकिंग में राशि दर्ज रहती है ताकि आपके और सैलून दोनों के पास रिकॉर्ड रहे।',
  'help.commission': 'कमीशन',
  'help.commissionFree': 'सैलून सेवा मूल्य का 100% रखते हैं। आज कोई प्लेटफ़ॉर्म कमीशन नहीं है।',
  'help.commissionRate': 'सैलून सेवा मूल्य का {pct}% रखते हैं।',
  'help.needHelp': 'मदद चाहिए? हमसे चैट करें',
  'help.waText': 'हमारी सहायता टीम को WhatsApp पर संदेश भेजें — हम आमतौर पर कुछ ही मिनटों में जवाब देते हैं।',
  'help.waBtn': 'WhatsApp पर चैट करें',
  'help.commonQuestions': 'सामान्य प्रश्न',

  // --- Support chat (Help page) ---
  'chat.title': 'SalonSaathi सहायक',
  'chat.subtitle': 'कोई सामान्य प्रश्न पूछें या टीम से संपर्क करें',
  'chat.greeting': 'नमस्ते! 👋 हम आपकी कैसे मदद कर सकते हैं? नीचे एक प्रश्न चुनें।',
  'chat.escalate': 'अभी भी मदद चाहिए? हमारी टीम से सीधे संपर्क करें:',
  'chat.whatsapp': 'WhatsApp करें',
  'chat.call': 'कॉल करें',
  'chat.email': 'ईमेल करें',
  'chat.back': 'दूसरा प्रश्न पूछें',
  'chat.you': 'आप',
}

const DICTS = { en: EN, hi: HI }

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

/** Returns a `t(key, vars)` translator bound to the current language. */
export function useT() {
  const { lang } = usePrefs()
  const dict = DICTS[lang] || EN
  return (key, vars) => interpolate(dict[key] ?? EN[key] ?? key, vars)
}
