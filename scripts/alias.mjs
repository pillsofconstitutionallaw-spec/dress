// Fa capire a node gli import scritti "@/lib/…", che altrimenti conosce solo
// Next (li configura jsconfig.json). Serve per poter provare le funzioni pure
// senza tirarsi dietro tutto il framework.
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const radice = pathToFileURL(`${process.cwd()}/`);

// Next lascia sottintendere l'estensione, node no — e vale per tutte e due le
// forme in cui l'app scrive gli import: "@/lib/…" e "./capo". Senza la
// seconda, un file che ne importa un altro accanto a sé non si può provare:
// lib/ai/demo.js importa "./capo" ed era irraggiungibile da una prova.
const conEstensione = (percorso) => (/\.[a-z]+$/.test(percorso) ? percorso : `${percorso}.js`);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(new URL(conEstensione(specifier.slice(2)), radice).href, context);
    }
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      return next(conEstensione(specifier), context);
    }
    return next(specifier, context);
  },
});
