// ─────────────────────────────────────────────────────────────
// Cambia SOLO questa riga quando decidi il nome definitivo.
export const BRAND = "Dress";
// ─────────────────────────────────────────────────────────────

// Gli stili, raggruppati per famiglia.
//
// Il raggruppamento non è decorativo: settanta voci in un menù piatto non si
// leggono, e servono anche all'AI per capire che "Balletcore" e "Coquette"
// sono parenti, mentre "Techwear" sta da un'altra parte.
export const FAMIGLIE_STILI = [
  {
    famiglia: "Senza tempo",
    stili: ["Classico", "Minimal", "Sartoriale italiano", "Quiet luxury / Old money",
            "Preppy", "Ivy League", "British / Countryside", "Normcore", "Scandi", "Bon ton / Borghese", "Parisian chic", "Milanese", "Total black"],
  },
  {
    famiglia: "Tutti i giorni",
    stili: ["Casual", "Smart casual", "Business / Formale", "Business casual",
            "Loungewear / Comfort", "Athleisure / Sportivo", "Weekend", "Da viaggio", "Smart working"],
  },
  {
    famiglia: "Urbani e street",
    stili: ["Streetwear", "Skate", "Hip-hop", "Techwear", "Gorpcore / Outdoor",
            "Blokecore", "Utilitario / Workwear", "Militare", "Cargo", "Grime / UK street", "Surf", "Biker / Motociclista", "Sneakerhead", "Court / Basket"],
  },
  {
    famiglia: "Romantici",
    stili: ["Romantico", "Bohémien", "Cottagecore", "Coquette", "Balletcore",
            "Prairie", "Folk", "Lingerie-inspired", "Regencycore", "Shabby chic", "Whimsigoth"],
  },
  {
    famiglia: "Alternativi",
    stili: ["Grunge", "Rock / Edgy", "Punk", "Metal", "Goth", "Emo",
            "Dark academia", "Light academia", "Avant-garde", "Cyber", "Industrial", "Steampunk", "Visual kei", "E-girl / E-boy"],
  },
  {
    famiglia: "Retrò",
    stili: ["Vintage / Retrò", "Anni 50 / Pin-up", "Anni 60 / Mod", "Anni 70 / Disco",
            "Anni 80 / Power dressing", "Anni 90 / Minimal", "Y2K", "Rockabilly", "Anni 20 / Gatsby", "Anni 40", "Mid-century", "Vintage sportivo"],
  },
  {
    famiglia: "Di tendenza",
    stili: ["Clean girl", "Mob wife", "Office siren", "Tomboy", "Androgino",
            "Maximalista", "Colour blocking", "Monocromatico", "Logomania", "Oversize", "Barbiecore", "Tomato girl", "Coastal grandmother", "Indie sleaze"],
  },
  {
    famiglia: "Luoghi e atmosfere",
    stili: ["Coastal / Riviera", "Mediterraneo", "Western", "Safari", "Tropicale",
            "Urbano notturno", "Alpino", "Nordico", "Giapponese", "K-fashion", "Californiano", "New York minimal"],
  },
  {
    famiglia: "Occasioni",
    stili: ["Glam / Serata", "Red carpet", "Cerimonia", "Matrimonio invitato",
            "Primo appuntamento", "Colloquio", "Aperitivo", "Serata a teatro", "Laurea"],
  },
  {
    famiglia: "Con un'idea dietro",
    stili: ["Artsy", "Eclettico", "Sostenibile / Slow fashion", "Second-hand / Thrift",
            "Capsule wardrobe", "Uniform dressing"],
  },
  {
    famiglia: "Materiali e forme",
    stili: ["Denim su denim", "Pelle", "Maglieria", "Sartoria destrutturata",
            "Linee morbide", "Linee nette", "Trasparenze", "Tessuti naturali"],
  },
  {
    famiglia: "Codici di abbigliamento",
    stili: ["Black tie", "Cocktail", "Business formal", "Casual Friday",
            "Smart elegante", "Divisa personale"],
  },
];


// Come veste un capo. È un asse diverso dallo stile: "baggy" non è uno stile,
// è una misura. Serve raggruppata perché l'utente ragiona per sensazione
// ("comodo", "aderente") mentre i negozi scrivono per gergo ("relaxed fit").
export const VESTIBILITA = [
  {
    gruppo: "Quanto è largo",
    voci: [
      { nome: "Aderente", chiavi: ["skinny", "aderent", "super slim", "second skin"] },
      { nome: "Slim", chiavi: ["slim", "attillat"] },
      { nome: "Regolare", chiavi: ["regular", "regolare", "classic fit"] },
      { nome: "Comodo", chiavi: ["relaxed", "comod", "morbid", "easy fit"] },
      { nome: "Loose", chiavi: ["loose"] },
      { nome: "Baggy", chiavi: ["baggy"] },
      { nome: "Oversize", chiavi: ["oversize", "over fit"] },
    ],
  },
  {
    gruppo: "Come cade la gamba",
    voci: [
      { nome: "Dritto", chiavi: ["dritt", "straight"] },
      { nome: "Affusolato", chiavi: ["tapered", "affusolat", "carrot"] },
      { nome: "Gamba larga", chiavi: ["wide leg", "gamba larga", "palazzo"] },
      { nome: "Flare / zampa", chiavi: ["flare", "zampa", "svasat"] },
      { nome: "Bootcut", chiavi: ["bootcut"] },
      { nome: "Barrel", chiavi: ["barrel", "a botte"] },
      { nome: "Culotte", chiavi: ["culotte"] },
    ],
  },
  {
    gruppo: "Dove sta la vita",
    voci: [
      { nome: "Vita alta", chiavi: ["vita alta", "high waist", "high rise"] },
      { nome: "Vita media", chiavi: ["vita media", "mid rise"] },
      { nome: "Vita bassa", chiavi: ["vita bassa", "low waist", "low rise"] },
      { nome: "Paperbag", chiavi: ["paperbag"] },
    ],
  },
  {
    gruppo: "Quanto è lungo",
    voci: [
      { nome: "Crop", chiavi: ["crop"] },
      { nome: "Alla caviglia", chiavi: ["caviglia", "ankle", "7/8"] },
      { nome: "Midi", chiavi: ["midi"] },
      { nome: "Mini", chiavi: ["mini"] },
      { nome: "Maxi / lungo", chiavi: ["maxi", "lungo"] },
      { nome: "Bermuda", chiavi: ["bermuda", "shorts", "corto"] },
    ],
  },
  {
    gruppo: "Sportivi e da lavoro",
    voci: [
      { nome: "Jogger", chiavi: ["jogger"] },
      { nome: "Tuta / track", chiavi: ["tuta", "track pant", "felpat"] },
      { nome: "Cargo", chiavi: ["cargo"] },
      { nome: "Carpenter", chiavi: ["carpenter", "workwear"] },
      { nome: "Leggings", chiavi: ["legging"] },
    ],
  },
  {
    gruppo: "Con un nome proprio",
    voci: [
      { nome: "Mom", chiavi: ["mom "] },
      { nome: "Boyfriend", chiavi: ["boyfriend"] },
      { nome: "Girlfriend", chiavi: ["girlfriend"] },
      { nome: "Chino", chiavi: ["chino"] },
      { nome: "Pinocchietto", chiavi: ["pinocchiett", "capri"] },
    ],
  },
];

export const TUTTE_LE_VESTIBILITA = VESTIBILITA.flatMap((g) => g.voci);


// Cosa vuol dire ogni stile, in una riga.
//
// Senza questo l'elenco è inservibile: nessuno sceglie "Blokecore" o "Quiet
// luxury" se non sa cosa sono. La regola seguita: dire cosa ti metti addosso,
// non evocare un'atmosfera.
export const SPIEGAZIONI_STILI = {
  "Classico": "Capi che esistono da cinquant'anni e ci saranno fra altri cinquanta: camicia, blazer, trench.",
  "Minimal": "Poche linee pulite, nessun dettaglio inutile, colori pieni. Meno cose, scelte meglio.",
  "Sartoriale italiano": "Giacca che cade bene, spalla morbida, tessuti veri. L'eleganza che non urla.",
  "Quiet luxury / Old money": "Qualità evidente senza un logo in vista. Cashmere, lino, beige e blu.",
  "Preppy": "Il college americano: polo, mocassini, maglioncino sulle spalle, righe.",
  "Ivy League": "Il preppy delle origini, più austero: oxford button-down, chino, penny loafer.",
  "British / Countryside": "Tweed, cerato verde, stivali di gomma. La campagna inglese in città.",
  "Normcore": "Il non-stile come stile: capi ordinari, comodi, senza pretese. Jeans e felpa grigia.",
  "Scandi": "Nordico: linee semplici, toni neutri, tessuti naturali. Caldo senza essere pesante.",
  "Bon ton / Borghese": "Composto e di buon gusto: gonna al ginocchio, cardigan, décolleté basse.",
  "Parisian chic": "Studiatamente trascurato: marinière, jeans dritti, ballerine, trench.",
  "Milanese": "Nero e grigio, tagli precisi, scarpe importanti. Città, sera, lavoro.",
  "Total black": "Nero da capo a piedi. Sembra facile, regge solo se le forme sono giuste.",
  "Casual": "Quello di tutti i giorni: jeans, maglietta, sneaker. Comodo senza trascuratezza.",
  "Smart casual": "Sta in ufficio e a cena: blazer sopra i jeans, mocassini invece delle sneaker.",
  "Business / Formale": "Completo, camicia, scarpa allacciata. Dove il codice non si discute.",
  "Business casual": "Ufficio senza cravatta: chino, camicia, maglia fine, derby o mocassino.",
  "Loungewear / Comfort": "Da casa ma presentabile: maglieria morbida, tute belle, tessuti che non graffiano.",
  "Athleisure / Sportivo": "Abbigliamento sportivo portato fuori dalla palestra: leggings, felpe, sneaker tecniche.",
  "Streetwear": "Felpe oversize, grafiche, sneaker che contano. Nato dallo skate e dall'hip-hop.",
  "Skate": "Largo e vissuto: jeans ampi, t-shirt, scarpe piatte fatte per rovinarsi.",
  "Hip-hop": "Volumi grandi, catene, tute, cappellini. Dal Bronx in poi.",
  "Techwear": "Nero, tessuti tecnici, tasche ovunque, cerniere. Sembra vestito per la pioggia in città.",
  "Gorpcore / Outdoor": "Roba da montagna portata in città: pile, giacche a vento, scarponcini.",
  "Blokecore": "Maglia da calcio d'epoca, jeans, sneaker retrò. Il tifoso inglese anni Novanta.",
  "Utilitario / Workwear": "Nato per lavorare: tele robuste, tasconi, giacche da operaio, denim spesso.",
  "Militare": "Verde oliva, parka, campo, anfibi. Capi pensati per durare.",
  "Cargo": "Tasche grandi sulle gambe, tessuti resistenti, taglio largo.",
  "Romantico": "Pizzi, volant, fiori piccoli, tessuti che si muovono. Dolce senza essere infantile.",
  "Bohémien": "Lungo, fluido, stampato: gonne ampie, frange, ricami, sandali piatti.",
  "Cottagecore": "La campagna idealizzata: grembiuli, fiorellini, maglie fatte a mano, lino.",
  "Coquette": "Fiocchi, rosa, merletti, calze. Femminile dichiarato, quasi teatrale.",
  "Balletcore": "Dalla sala danza: body, ballerine con i nastri, cardigan avvolgenti, tulle.",
  "Prairie": "Abiti lunghi col collo alto e le maniche a sbuffo. La frontiera americana.",
  "Folk": "Ricami tradizionali, lana grossa, motivi popolari di ogni parte del mondo.",
  "Lingerie-inspired": "Sottovesti portate come abiti, raso, spalline sottili. La biancheria che esce allo scoperto.",
  "Grunge": "Camicia a quadri sopra la t-shirt, jeans strappati, anfibi. Seattle 1992.",
  "Rock / Edgy": "Pelle nera, borchie, jeans stretti, stivaletti. Il chiodo è il capo che comanda.",
  "Punk": "Strappi, spille, tartan, borchie. Fatto in casa e volutamente sgraziato.",
  "Metal": "Nero, magliette di band, denim con le toppe, capelli lunghi.",
  "Goth": "Nero assoluto, pizzo, velluto, argento. Romantico e cupo insieme.",
  "Emo": "Nero e colori accesi, frangia lunga, jeans stretti, cinture a borchie.",
  "Dark academia": "La biblioteca d'inverno: tweed, maglioni a trecce, cappotti, marrone e bordeaux.",
  "Light academia": "La stessa biblioteca ma d'estate: beige, avorio, lino, cardigan chiari.",
  "Avant-garde": "Forme che non ti aspetti: asimmetrie, volumi strani, capi che sembrano sculture.",
  "Cyber": "Futurista: lucidi, riflettenti, argento, forme che sembrano attrezzatura.",
  "Vintage / Retrò": "Capi di seconda mano scelti bene, di qualunque epoca, mescolati con cura.",
  "Anni 50 / Pin-up": "Vita stretta, gonne a ruota, pois, rossetto. La forma a clessidra.",
  "Anni 60 / Mod": "Geometrie, colori piatti, minigonne, giacche corte. Londra beat.",
  "Anni 70 / Disco": "Zampa d'elefante, camicie aperte, lurex, terre e arancioni.",
  "Anni 80 / Power dressing": "Spalle larghe, colori forti, blazer importanti. Vestirsi per comandare.",
  "Anni 90 / Minimal": "Slip dress, tinte piatte, sandali sottili, niente decorazioni.",
  "Y2K": "Duemila: vita bassissima, lucidi, brillantini, occhiali piccoli.",
  "Rockabilly": "Anni Cinquanta americani: denim con risvolto, bandana, giacche in pelle.",
  "Clean girl": "Tutto ordinato: capelli tirati, oro sottile, capi lisci e neutri, niente eccessi.",
  "Mob wife": "Pelliccia, occhiali scuri, oro pesante, animalier. Vistoso e senza scuse.",
  "Office siren": "L'ufficio reso sensuale: camicia aderente, gonna a tubo, occhiali sottili.",
  "Tomboy": "Capi da uomo indossati da donna: camicie larghe, jeans dritti, scarpe piatte.",
  "Androgino": "Né maschile né femminile: linee dritte, tagli neutri, forme che non dichiarano.",
  "Maximalista": "Tanto di tutto: colori, stampe, accessori. L'opposto esatto del minimal.",
  "Colour blocking": "Blocchi di colori pieni e contrastanti, accostati senza sfumare.",
  "Monocromatico": "Un colore solo, in tutte le sue gradazioni, dalla testa ai piedi.",
  "Logomania": "I marchi in vista, ripetuti, come decorazione.",
  "Oversize": "Tutto più largo di una o due misure, di proposito.",
  "Coastal / Riviera": "Mare d'Europa: lino bianco, righe, sandali di cuoio, blu e sabbia.",
  "Mediterraneo": "Sud: camicie leggere, colori caldi, tessuti che respirano, niente giacche.",
  "Western": "Stivali col tacco, camicie con i bottoni a pressione, denim, frange.",
  "Safari": "Sahariana, kaki, tasche, cotoni robusti. Il viaggio di inizio Novecento.",
  "Tropicale": "Stampe di foglie e fiori grandi, colori accesi, camicie aperte.",
  "Urbano notturno": "Sera in città: nero, pelle, tagli netti, un dettaglio che brilla.",
  "Alpino": "Montagna: lana cotta, loden, verde e grigio, scarponcini.",
  "Nordico": "Grigi e blu freddi, lane pesanti, forme semplici. Poca luce, molta sostanza.",
  "Giapponese": "Volumi ampi, strati, tinte scure, tessuti particolari. Forma prima di tutto.",
  "K-fashion": "Coreano: proporzioni curate, colori tenui, dettagli precisi, aria giovane.",
  "Californiano": "Sole: denim chiaro, magliette morbide, sandali, niente di formale.",
  "New York minimal": "Nero, grigio, cammello. Pochi capi, molto buoni, sempre gli stessi.",
  "Glam / Serata": "Per farsi guardare: tessuti che brillano, tagli decisi, tacco alto.",
  "Red carpet": "L'abito importante, lungo, costruito. L'occasione una volta l'anno.",
  "Cerimonia": "Matrimoni e battesimi: abiti compiti, colori tenui, scarpe eleganti.",
  "Matrimonio invitato": "Elegante ma senza rubare la scena: mai bianco, mai troppo nero.",
  "Primo appuntamento": "Ti somiglia ma un po' meglio: comodo, curato, niente costumi.",
  "Colloquio": "Sobrio e ordinato: dice che sai leggere il contesto, senza dire altro.",
  "Aperitivo": "Fra ufficio e sera: si cambia una cosa sola e il look gira.",
  "Serata a teatro": "Composto e un po' più scuro del solito, senza arrivare al formale.",
  "Laurea": "Fotografato per sempre: scegli qualcosa che fra dieci anni non ti imbarazzi.",
  "Artsy": "Colori e forme scelti come si sceglie un quadro: personale, non di tendenza.",
  "Eclettico": "Cose che non dovrebbero stare insieme, messe insieme bene.",
  "Sostenibile / Slow fashion": "Pochi capi, fatti bene, che durano. Si guarda l'etichetta.",
  "Second-hand / Thrift": "Usato scelto con pazienza: costa meno, dura di più, non lo ha nessun altro.",
  "Capsule wardrobe": "Trenta capi che si abbinano tutti fra loro. Meno scelte, meno errori.",
  "Uniform dressing": "La stessa cosa ogni giorno, ma giusta. Si smette di pensarci.",
  "Denim su denim": "Jeans e giacca di jeans insieme, di tonalità diverse.",
  "Pelle": "La pelle come materiale principale: giacche, gonne, pantaloni.",
  "Maglieria": "Lana e cotone lavorati: trecce, coste, tessuti che scaldano e cadono.",
  "Sartoria destrutturata": "Giacche senza rinforzi: la forma della sartoria, la comodità di un cardigan.",
  "Linee morbide": "Tessuti che seguono il corpo senza costringerlo: cadute fluide, niente rigidità.",
  "Linee nette": "Tagli precisi, spalle definite, tessuti che tengono la forma.",
  "Trasparenze": "Tessuti che lasciano intravedere, a strati, dosati.",
  "Tessuti naturali": "Cotone, lino, lana, seta. Costano di più e si comportano meglio.",
  "Black tie": "Smoking o abito lungo. Scritto sull'invito, non si interpreta.",
  "Cocktail": "Elegante ma non lungo: abito corto o completo scuro.",
  "Business formal": "Completo scuro, camicia bianca, scarpa allacciata. Banche e tribunali.",
  "Casual Friday": "L'ufficio col freno tirato: niente cravatta, sì jeans scuri.",
  "Smart elegante": "Curato senza essere formale: la via di mezzo che salva la maggior parte delle sere.",
  "Divisa personale": "La tua combinazione che funziona sempre, ripetuta senza vergogna.",
  "Sneakerhead": "Le scarpe comandano il look: modelli rari, colorway, il resto fa da sfondo.",
  "Biker / Motociclista": "Chiodo, stivali, jeans robusti. Nato per andare in moto davvero.",
  "Grime / UK street": "Londra: tute tecniche, cappucci, sneaker chunky, marchi sportivi.",
  "Surf": "Mare e sale: bermuda, magliette slavate, infradito, capelli spettinati.",
  "Court / Basket": "Il campo da basket: canotte, sneaker alte, tute, numeri.",
  "Regencycore": "Vita alta sotto il seno, tessuti leggeri, guanti. L'Ottocento romanzato.",
  "Shabby chic": "Pastelli slavati, pizzi vissuti, cose che sembrano ereditate.",
  "Whimsigoth": "Gotico ma leggero: velluti scuri, stelle, lune, stampe misteriose.",
  "Industrial": "Grigio, metallo, cinghie, forme spigolose.",
  "Steampunk": "Ottocento immaginario: corsetti, ingranaggi, cuoio, ottone.",
  "Visual kei": "Giappone: trucco marcato, capelli costruiti, abiti teatrali.",
  "E-girl / E-boy": "Internet: strati, catene, calze a righe, colori sgargianti su nero.",
  "Anni 20 / Gatsby": "Frange, perle, vita bassa, ricami. Il jazz e lo champagne.",
  "Anni 40": "Spalle costruite, gonne al ginocchio, tailleur. Sobrio per necessità.",
  "Mid-century": "Anni Cinquanta e Sessanta puliti: linee semplici, colori pieni, niente fronzoli.",
  "Vintage sportivo": "Tute e felpe d'epoca, marchi sportivi di trent'anni fa.",
  "Barbiecore": "Rosa acceso da capo a piedi, senza mezze misure.",
  "Tomato girl": "Estate italiana: rosso, bianco, cesti di vimini, sandali.",
  "Coastal grandmother": "Lino chiaro, camicie larghe, cappelli di paglia: la casa al mare, con calma.",
  "Indie sleaze": "Duemiladieci disordinati: flash, jeans stretti, giacche di pelle, poco curato di proposito.",
  "Weekend": "Sabato: comodo, caldo, niente che vada stirato.",
  "Da viaggio": "Strati, tasche, tessuti che non si sgualciscono, scarpe che si tolgono in fretta.",
  "Smart working": "Presentabile da metà in su, comodo da metà in giù.",
};

export function spiegaStile(nome) {
  return SPIEGAZIONI_STILI[nome] || "";
}

// L'elenco piatto, per i menù e per i controlli.
export const STYLES = [
  "Non so ancora — aiutami a scoprirlo",
  ...FAMIGLIE_STILI.flatMap((f) => f.stili),
];

// Solo i nomi consigliabili dall'AI: senza il "non so", che è una risposta
// dell'utente, non uno stile.
export const STILI_CONSIGLIABILI = FAMIGLIE_STILI.flatMap((f) => f.stili);

export const HAIR = ["Neri", "Castano scuro", "Castano chiaro", "Biondi", "Rossi", "Grigi / Sale e pepe", "Bianchi", "Colorati"];
export const EYES = ["Marroni", "Nocciola", "Verdi", "Azzurri", "Grigi", "Ambra"];

export const OUTFIT_MODES = [
  { id: "elegante", label: "Elegante" },
  { id: "casual", label: "Casual" },
  { id: "smart", label: "Elegante + casual" },
  { id: "lavoro", label: "Lavoro" },
  { id: "sera", label: "Sera / Evento" },
];

// Retailer con flag fast fashion. I link puntano alla RICERCA del sito
// (deep-link): nessuna API, nessun costo, sempre aggiornato.
export const RETAILERS = [
  { name: "COS", fast: false, tier: "medio", search: (q) => `https://www.cos.com/en_eur/search.html?q=${encodeURIComponent(q)}` },
  { name: "Arket", fast: false, tier: "medio", search: (q) => `https://www.arket.com/en/search.html?q=${encodeURIComponent(q)}` },
  { name: "Massimo Dutti", fast: false, tier: "medio", search: (q) => `https://www.massimodutti.com/it/search?term=${encodeURIComponent(q)}` },
  { name: "Uniqlo", fast: false, tier: "accessibile", search: (q) => `https://www.uniqlo.com/it/it/search?q=${encodeURIComponent(q)}` },
  { name: "Zara", fast: true, tier: "accessibile", search: (q) => `https://www.zara.com/it/it/search?searchTerm=${encodeURIComponent(q)}` },
  { name: "H&M", fast: true, tier: "accessibile", search: (q) => `https://www2.hm.com/it_it/search-results.html?q=${encodeURIComponent(q)}` },
  { name: "Mango", fast: true, tier: "accessibile", search: (q) => `https://shop.mango.com/it/search?kw=${encodeURIComponent(q)}` },
  { name: "Vinted (second-hand)", fast: false, tier: "second-hand", search: (q) => `https://www.vinted.it/catalog?search_text=${encodeURIComponent(q)}` },
];

export function vintedListingUrl(q) {
  return `https://www.vinted.it/items/new?search_text=${encodeURIComponent(q)}`;
}

// Colori dell'anno (curati). Aggiornali a mano ogni stagione.
export const COLORS_OF_YEAR = [
  { name: "Terracotta calda", hex: "#B5654A", note: "Neutro caldo, sostituisce il nero nei mesi di mezzo." },
  { name: "Verde salvia", hex: "#9AA88B", note: "Riposante, sta con crema e denim." },
  { name: "Burro", hex: "#EDE3C8", note: "L'alternativa morbida al bianco ottico." },
  { name: "Blu inchiostro", hex: "#2B3A55", note: "Più profondo del navy, elegante di sera." },
  { name: "Marrone cacao", hex: "#5A4632", note: "La base terrosa dell'anno." },
  { name: "Rosa cipria", hex: "#D9B8B0", note: "Delicato senza essere infantile." },
];

// Offerte della settimana (curato/mock — sostituibile con affiliazione).
export const WEEKLY_OFFERS = [
  { retailer: "COS", deal: "Fino a -40% sulla maglieria", fast: false, url: "https://www.cos.com/en_eur/sale.html" },
  { retailer: "Arket", deal: "Selezione archivio scontata", fast: false, url: "https://www.arket.com/en/sale.html" },
  { retailer: "Uniqlo", deal: "Offerte limitate settimanali", fast: false, url: "https://www.uniqlo.com/it/it/spl/limited-offers" },
  { retailer: "Massimo Dutti", deal: "Nuovi ribassi stagione", fast: false, url: "https://www.massimodutti.com/it/saldi" },
  { retailer: "Vinted", deal: "Second-hand: il modo più etico di spendere meno", fast: false, url: "https://www.vinted.it/" },
];

export const FAST_FASHION_NOTE =
  "Il fast fashion produce enormi volumi a costi bassissimi grazie a cicli rapidissimi e prezzi compressi. " +
  "Questo si traduce spesso in impatto ambientale elevato (acqua, microplastiche, rifiuti tessili), pressione sui lavoratori della filiera e capi poco durevoli. " +
  "Non è un divieto: è un'informazione. Comprare meno e meglio, o usato, riduce l'impatto.";
