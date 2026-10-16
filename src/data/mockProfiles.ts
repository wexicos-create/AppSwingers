import { Profile, EventTier, ClubEvent, Proposal, Creator, LiveStream, ReportItem } from '../types';

export const PASSION_TAGS_MX = [
  "Swinger",
  "Intercambio suave",
  "Intercambio completo",
  "Tríos HMH",
  "Tríos MHM",
  "Gangbang",
  "Encuentros casuales",
  "Encuentros informales",
  "Solo mirar",
  "Hotwife",
  "Exhibicionismo",
  "Fiestas privadas",
  "Antifaz",
  "Primera vez",
  "Cena previa",
  "Discreción total",
  "Cero dramas",
  "Química primero"
];

export const PASSION_TAGS_US = [
  "Couple swap",
  "Soft swap",
  "Full swap",
  "MFM threesome",
  "FMF threesome",
  "Hotwife",
  "Dinner date first",
  "Private parties",
  "Masquerade",
  "Voyeurism",
  "Exhibitionism",
  "First timers",
  "Strictly discreet",
  "No drama",
  "Chemistry first"
];

export const PASSION_TAGS = PASSION_TAGS_MX;

export const SEEKING_OPTIONS = ["Parejas", "Mujeres", "Hombres", "Grupos"];
export const AGE_RANGES = ["Colágeno 18–25", "26–39", "Madura / maduro 40+"];

export const EVENT_TIERS: EventTier[] = [
  { id: "pareja", label: "Pareja", note: "Entrada para dos personas", price: 700, seats: 2 },
  { id: "caballero", label: "Caballero individual", note: "Entrada individual", price: 600, seats: 1 },
  { id: "dama", label: "Dama individual", note: "Tarifa promocional, sujeta a disponibilidad", price: 500, seats: 1, promo: true }
];

export const INITIAL_PROFILES: Profile[] = [
  // MÉXICO (MX) PROFILES
  {
    id: "p-emma",
    name: "Emma",
    kind: "Dama",
    age: 27,
    ages: "27",
    km: 3,
    distance: "3.2 km",
    country: "MX",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 310,
    tags: ["Hotwife", "Intercambio suave", "Fiestas privadas", "Cena previa", "Química primero"],
    bio: "Apasionada por las conexiones auténticas y las conversaciones estimulantes. Busco parejas respetuosas o damas con excelente química, discreción absoluta y reglas claras.",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "14 sep",
    occupation: "Diseñadora & Creativa",
    zodiac: "Escorpio",
    height: "168 cm",
    verified: true,
    online: true,
    matchPercentage: 99
  },
  {
    id: "p1",
    name: "Marina & Leo",
    kind: "Pareja",
    age: 34,
    ages: "34 · 37",
    km: 4,
    distance: "4.2 km",
    country: "MX",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 285,
    tags: ["Swinger", "Intercambio suave", "Fiestas privadas", "Cena previa", "Discreción total"],
    bio: "Pareja liberal con experiencia y complicidad. Química primero, respeto absoluto y reglas claras siempre. Nos encanta la buena plática antes de cualquier plan.",
    photo: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "12 sep",
    occupation: "Arquitectos",
    zodiac: "Leo / Tauro",
    verified: true,
    online: true,
    matchPercentage: 97
  },
  {
    id: "p-ava",
    name: "Carolina",
    kind: "Dama",
    age: 26,
    ages: "26",
    km: 2,
    distance: "2.1 km",
    country: "MX",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 330,
    tags: ["Hotwife", "Antifaz", "Tríos MHM", "Cero dramas", "Discreción total"],
    bio: "Independiente, segura y con gustos refinados. Disfruto del juego previo, el ambiente festivo selecto y los encuentros consensuados.",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "18 sep",
    occupation: "Consultora",
    zodiac: "Aries",
    verified: true,
    online: true,
    matchPercentage: 100
  },
  {
    id: "p2",
    name: "Valeria",
    kind: "Dama",
    age: 31,
    ages: "31",
    km: 3,
    distance: "3.5 km",
    country: "MX",
    likesYou: false,
    verify: "verificado",
    status: "activo",
    hue: 320,
    tags: ["Tríos MHM", "Encuentros casuales", "Hotwife", "Exhibicionismo"],
    bio: "Sé lo que quiero y lo digo claro. Discreción, complicidad y respeto ante todo. Abierta a conocer parejas o caballeros educados.",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "20 sep",
    occupation: "Marketing Executive",
    zodiac: "Géminis",
    verified: true,
    online: true,
    matchPercentage: 92
  },
  {
    id: "p3",
    name: "Andrés & Sofi",
    kind: "Pareja",
    age: 29,
    ages: "29 · 30",
    km: 8,
    distance: "8.0 km",
    country: "MX",
    likesYou: true,
    verify: "en revisión",
    status: "activo",
    hue: 255,
    tags: ["Primera vez", "Solo mirar", "Antifaz", "Fiestas privadas"],
    bio: "Nuevos en el ambiente con mente abierta. Buscamos dar nuestros primeros pasos con calma, asistiendo a eventos de antifaz y observando.",
    photo: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "2 oct",
    occupation: "Diseñadores",
    zodiac: "Libra",
    verified: false,
    online: false,
    matchPercentage: 88
  },
  {
    id: "p4",
    name: "Rodrigo",
    kind: "Caballero",
    age: 38,
    ages: "38",
    km: 6,
    distance: "6.5 km",
    country: "MX",
    likesYou: false,
    verify: "verificado",
    status: "activo",
    hue: 230,
    tags: ["Tríos HMH", "Caballero individual", "Cena previa", "Discreción total"],
    bio: "Discreto, educado, verificado y con análisis al día. Excelente trato, me adapto a las reglas y fantasías de la pareja o dama.",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "28 sep",
    occupation: "Consultor Financiero",
    zodiac: "Sagitario",
    height: "182 cm",
    verified: true,
    online: true,
    matchPercentage: 90
  },
  {
    id: "p5",
    name: "Ximena & Pau",
    kind: "Pareja",
    age: 33,
    ages: "33 · 35",
    km: 12,
    distance: "12.0 km",
    country: "MX",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 300,
    tags: ["Intercambio completo", "Fiestas privadas", "Exhibicionismo", "Química primero"],
    bio: "Anfitrionas de reuniones selectas en el Bajío. Parejas liberales que buscan conexión genuina y diversión sin culpas.",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "5 oct",
    occupation: "Empresarias",
    zodiac: "Tauro",
    verified: true,
    online: true,
    matchPercentage: 96
  },
  {
    id: "p6",
    name: "Carlos & Elena",
    kind: "Pareja",
    age: 36,
    ages: "36 · 38",
    km: 15,
    distance: "15.0 km",
    country: "MX",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 290,
    tags: ["Intercambio suave", "Hotwife", "Cena previa", "Respeto mutuo"],
    bio: "Pareja liberal apasionada y viajera. Buscamos parejas o damas afines para compartir veladas inolvidables con total complicidad.",
    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "7 oct",
    occupation: "Empresarios",
    zodiac: "Virgo / Cáncer",
    verified: true,
    online: true,
    matchPercentage: 94
  },

  // UNITED STATES (US) PROFILES
  {
    id: "p-us-sophia",
    name: "Sophia & Liam",
    kind: "Pareja",
    age: 32,
    ages: "32 · 35",
    km: 6,
    distance: "3.8 mi",
    country: "US",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 280,
    tags: ["Soft swap", "Private parties", "Dinner first", "Discreet & verified"],
    bio: "Established lifestyle couple in Miami. High energy, authentic vibes, strict privacy and mutual respect. Let's do drinks first and see where the chemistry leads.",
    photo: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "10 sep",
    occupation: "Tech & Real Estate",
    zodiac: "Leo / Scorpio",
    verified: true,
    online: true,
    matchPercentage: 98
  },
  {
    id: "p-us-chloe",
    name: "Chloe",
    kind: "Dama",
    age: 28,
    ages: "28",
    km: 4,
    distance: "2.5 mi",
    country: "US",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 330,
    tags: ["Hotwife", "MFM threesome", "Dinner first", "No drama"],
    bio: "Confident, sensual and articulate. Love meeting respectful couples and well-mannered gentlemen for fun, consensual adventures. Safe sex and discretion are non-negotiable.",
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "15 sep",
    occupation: "Fashion Producer",
    zodiac: "Aries",
    verified: true,
    online: true,
    matchPercentage: 96
  },
  {
    id: "p-jack",
    name: "Jack Ryder",
    kind: "Caballero",
    age: 32,
    ages: "32",
    km: 7,
    distance: "4.5 mi",
    country: "US",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 240,
    tags: ["MFM threesome", "Discreet & verified", "Dinner first", "No drama"],
    bio: "Discreet, respectful, fitness enthusiast and tested regular. Great conversationalist, strictly attentive to the couple's rules and boundaries.",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "22 sep",
    occupation: "Software Engineer",
    zodiac: "Capricorn",
    height: "190 cm",
    verified: true,
    online: true,
    matchPercentage: 95
  },
  {
    id: "p-us-marcus",
    name: "Marcus & Olivia",
    kind: "Pareja",
    age: 37,
    ages: "37 · 39",
    km: 8,
    distance: "5.1 mi",
    country: "US",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 260,
    tags: ["Full swap", "Masquerade", "Strictly discreet", "Chemistry first"],
    bio: "Sophisticated couple in Los Angeles. Passionate about exclusive masquerades and tasteful private gatherings. Chemistry is everything.",
    photo: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "25 sep",
    occupation: "Creative Directors",
    zodiac: "Libra / Leo",
    verified: true,
    online: true,
    matchPercentage: 93
  },
  {
    id: "p-us-david",
    name: "David",
    kind: "Caballero",
    age: 34,
    ages: "34",
    km: 6,
    distance: "4.0 mi",
    country: "US",
    likesYou: false,
    verify: "verificado",
    status: "activo",
    hue: 230,
    tags: ["MFM threesome", "Discreet & verified", "First timers welcome", "No drama"],
    bio: "Respectful, discreet, tested regular and easy-going in Las Vegas. Here to enhance the couple's fantasies with zero expectations and 100% consent.",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "28 sep",
    occupation: "Architect",
    zodiac: "Sagittarius",
    height: "185 cm",
    verified: true,
    online: true,
    matchPercentage: 91
  },
  {
    id: "p-us-jessica",
    name: "Jessica & Tyler",
    kind: "Pareja",
    age: 30,
    ages: "30 · 32",
    km: 10,
    distance: "6.2 mi",
    country: "US",
    likesYou: true,
    verify: "verificado",
    status: "activo",
    hue: 310,
    tags: ["First timers", "Voyeurism", "Dinner first", "Private parties"],
    bio: "Down-to-earth couple in New York exploring the scene at our own pace. We prioritize emotional safety, good vibes, and private club nights.",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80"
    ],
    joined: "30 sep",
    occupation: "Attorneys",
    zodiac: "Gemini / Taurus",
    verified: true,
    online: false,
    matchPercentage: 89
  }
];

export const INITIAL_EVENTS: ClubEvent[] = [
  {
    id: "e1",
    title: "Noche de Antifaz Mascarada",
    theme: "Mascarada & Sensualidad",
    date: "Sáb 24 oct",
    time: "22:00",
    zone: "Polanco, CDMX",
    organizer: "AppSwinguer Club",
    own: true,
    cap: 120,
    sold: 86,
    reqs: ["Perfil verificado", "Mayor de 18", "Dress code: negro y antifaz de lujo"],
    paid: true,
    published: true,
    promoted: true,
    hue: 285
  },
  {
    id: "e2",
    title: "Cena Exclusiva de los Ocho",
    theme: "Cena privada & Maridaje",
    date: "Vie 30 oct",
    time: "21:00",
    zone: "Roma Norte, CDMX",
    organizer: "Agencia Velada",
    own: false,
    cap: 16,
    sold: 11,
    reqs: ["Solicitud aprobada por anfitriones", "Solo parejas liberales"],
    paid: true,
    published: true,
    promoted: false,
    hue: 250
  },
  {
    id: "e3",
    title: "Bienvenida al Ambiente Liberal",
    theme: "Primer contacto & Charla",
    date: "Dom 25 oct",
    time: "12:00",
    zone: "Coyoacán, CDMX",
    organizer: "Comunidad AppSwinguer",
    own: true,
    cap: 40,
    sold: 18,
    reqs: ["Mayor de 18 años", "Actitud de respeto y empatía"],
    paid: false,
    published: true,
    promoted: false,
    hue: 315
  }
];

export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: "r1",
    title: "Pareja para intercambio en la Noche de Antifaz",
    cat: "Swinger",
    author: "Pareja verificada · identidad limitada",
    when: "hace 2 h",
    apps: 7,
    status: "publicada",
    body: "Buscamos pareja liberal con quien compartir la mesa VIP y ver si surge química natural. Un cóctel previo en terraza para romper el hielo."
  },
  {
    id: "r2",
    title: "Busco dos caballeros educados para trío MHM",
    cat: "Tríos",
    author: "Dama verificada",
    when: "hace 5 h",
    apps: 3,
    status: "publicada",
    body: "Solo perfiles verificados y respetuosos. Primero videollamada dentro de la app, después cena en hotel boutique."
  },
  {
    id: "r3",
    title: "Fin de semana liberal en villa de Tepoztlán",
    cat: "Encuentro casual",
    author: "Pareja anfitriona · identidad limitada",
    when: "ayer",
    apps: 12,
    status: "publicada",
    body: "Villa privada con alberca climatizada y jacuzzi. Tres parejas máximo. Reglas de convivencia y consentimientos compartidos previamente."
  }
];

export const INITIAL_CREATORS: Creator[] = [
  {
    name: "Luna Roja",
    handle: "@lunaroja",
    followers: "14.2k",
    free: 18,
    price: 149,
    bio: "Hotwife mexicana. Contenido sensual y real con mi pareja. Transmisiones semanales exclusivas sin censura.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    status: "activa",
    subs: 42
  },
  {
    name: "Bahía",
    handle: "@bahia.mx",
    followers: "8.7k",
    free: 9,
    price: 119,
    bio: "Madura, atrevida y sin filtros. Directos de preguntas y confesiones cada jueves por la noche.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    status: "activa",
    subs: 28
  },
  {
    name: "Dúo Ámbar",
    handle: "@duoambar",
    followers: "6.1k",
    free: 22,
    price: 99,
    bio: "Pareja swinger. Detrás de cámaras de nuestras fiestas privadas, relatos eróticos y contenido íntimo.",
    avatar: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=400&q=80",
    status: "activa",
    subs: 35
  }
];

export const INITIAL_LIVES: LiveStream[] = [
  {
    id: "l1",
    title: "Noche de Antifaz VIP en vivo",
    host: "AppSwinguer Club",
    when: "Sáb 24 oct · 23:00",
    price: 199,
    status: "programado",
    hue: 285
  },
  {
    id: "l2",
    title: "Directo privado & Confesiones",
    host: "Luna Roja",
    when: "Jue 22 oct · 22:00",
    price: 149,
    status: "programado",
    hue: 310
  }
];

export const INITIAL_REPORTS: ReportItem[] = [
  {
    id: "rp1",
    target: { type: "usuario", id: "p4", name: "Rodrigo" },
    reason: "Perfil sospechoso de suplantación",
    when: "hace 3 h",
    status: "abierto"
  },
  {
    id: "rp2",
    target: { type: "propuesta", id: "r3", name: "Fin de semana liberal en villa" },
    reason: "Actividad comercial no declarada",
    when: "ayer",
    status: "abierto"
  }
];
