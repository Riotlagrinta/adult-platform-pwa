// Shim vide pour les modules Node.js que WebTorrent (et ses dépendances,
// via `@thaunknown/simple-peer`/`create-torrent`/`fs-chunk-store`) importent
// de façon défensive côté navigateur — leur propre `package.json` "browser"
// les mappe déjà sur `false`, mais Turbopack résout alors l'import sur
// `undefined` plutôt que sur un objet vide comme le fait webpack. Leur code
// suppose un objet vide (ex: `typeof os.tmpdir === 'function'`), pas
// `undefined` — sans ce shim, l'accès à une propriété plante immédiatement
// (`Cannot read properties of undefined`) au chargement du module.
const emptyModule = {};
export default emptyModule;
