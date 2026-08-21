// Fa capire a node gli import scritti "@/lib/…", che altrimenti conosce solo
// Next (li configura jsconfig.json). Serve per poter provare le funzioni pure
// senza tirarsi dietro tutto il framework.
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const radice = pathToFileURL(`${process.cwd()}/`);

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) return next(specifier, context);
    const senzaAlias = specifier.slice(2);
    // Next lascia sottintendere l'estensione, node no.
    const conEstensione = /\.[a-z]+$/.test(senzaAlias) ? senzaAlias : `${senzaAlias}.js`;
    return next(new URL(conEstensione, radice).href, context);
  },
});
