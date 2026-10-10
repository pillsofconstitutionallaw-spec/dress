"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// La mappa dei negozi qui intorno.
//
// Leaflet e le mappe di OpenStreetMap, per la stessa ragione per cui i
// negozi vengono da lì (lib/vicini.js): Google vuole una carta di credito e
// conta ogni mappa aperta. Questa è gratuita, e la licenza chiede solo di
// dire da dove viene — è la scritta in basso a destra.
//
// Leaflet tocca «window» appena lo si carica, e sul server window non c'è:
// per questo si importa dentro l'effetto, quando la pagina è già nel
// browser, e non in cima al file.
//
// Le mappe sono in grigio apposta: i negozi sono quadrati neri, e su una
// mappa a colori — parchi verdi, strade gialle — si perderebbero.
export default function MappaNegozi({ centro, negozi, scelto, onScegli }) {
  const box = useRef(null);
  const mappa = useRef(null);
  const leaflet = useRef(null);
  const segni = useRef(null);
  const [pronta, setPronta] = useState(false);

  // La mappa nasce una volta sola.
  useEffect(() => {
    let viva = true;
    (async () => {
      const mod = await import("leaflet");
      if (!viva || mappa.current || !box.current) return;
      const L = mod.default || mod;
      leaflet.current = L;

      const m = L.map(box.current, { zoomControl: false, attributionControl: false }).setView([centro.lat, centro.lon], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(m);
      L.control.zoom({ position: "bottomright" }).addTo(m);
      // Il credito a OpenStreetMap resta, perché la licenza lo chiede; quello
      // a Leaflet, con la bandierina, no: è una cortesia, non un obbligo, e
      // in un angolo di 390 pixel conta ogni parola.
      L.control.attribution({ prefix: false }).addTo(m);

      // Dove sei tu: un cerchio, non un segnaposto. È la posizione
      // arrotondata a cento metri, e un cerchio dice «più o meno qui».
      L.circleMarker([centro.lat, centro.lon], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#2f6fde",
        fillOpacity: 1,
      }).addTo(m);

      segni.current = L.layerGroup().addTo(m);
      mappa.current = m;
      setPronta(true);
    })();
    return () => {
      viva = false;
      mappa.current?.remove();
      mappa.current = null;
    };
    // Il centro cambia solo se si rifà la ricerca, e allora la pagina
    // ricrea la mappa da capo con una chiave nuova.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // I negozi: si ridisegnano quando cambiano, e la vista si allarga quanto
  // basta per vederli tutti.
  useEffect(() => {
    const L = leaflet.current;
    const m = mappa.current;
    if (!pronta || !L || !m) return;

    segni.current.clearLayers();
    for (const n of negozi) {
      const attivo = n.id === scelto;
      const segno = L.marker([n.lat, n.lon], {
        icon: L.divIcon({
          className: "",
          html: `<span class="segno-negozio${attivo ? " scelto" : ""}${n.inCatalogo ? " nostro" : ""}"></span>`,
          iconSize: attivo ? [20, 20] : [12, 12],
          iconAnchor: attivo ? [10, 10] : [6, 6],
        }),
        title: n.nome,
        keyboard: true,
        zIndexOffset: attivo ? 1000 : 0,
      });
      segno.on("click", () => onScegli(n.id));
      segni.current.addLayer(segno);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronta, negozi, scelto]);

  useEffect(() => {
    const L = leaflet.current;
    const m = mappa.current;
    if (!pronta || !L || !m || !negozi.length) return;
    const punti = negozi.map((n) => [n.lat, n.lon]);
    punti.push([centro.lat, centro.lon]);
    m.fitBounds(L.latLngBounds(punti), { padding: [28, 28], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronta, negozi]);

  // Chi tocca un negozio nell'elenco lo vuole vedere sulla mappa.
  useEffect(() => {
    const m = mappa.current;
    if (!pronta || !m || !scelto) return;
    const n = negozi.find((x) => x.id === scelto);
    if (n) m.panTo([n.lat, n.lon], { animate: true });
  }, [pronta, scelto, negozi]);

  return (
    <div
      ref={box}
      className="mappa-negozi"
      role="region"
      aria-label="Mappa dei negozi"
      style={{ height: 320, background: "var(--stone)", border: "1px solid var(--line)" }}
    />
  );
}
