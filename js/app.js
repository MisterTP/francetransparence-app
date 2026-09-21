async function loadData() {
  const v = "20260921h";
  const [b1Res, b2Res, b3Res, elusRes, circoRes] = await Promise.all([
    fetch("data/batch-1.json?v=" + v),
    fetch("data/batch-2.json?v=" + v),
    fetch("data/batch-3.json?v=" + v),
    fetch("data/elus.json?v=" + v),
    fetch("https://www.data.gouv.fr/api/1/datasets/r/092bd7bb-1543-405b-b53c-932ebb49bb8e")
  ]);
  if (!b1Res.ok || !b2Res.ok || !b3Res.ok || !elusRes.ok) throw new Error("données");
  const b1 = await b1Res.json();
  const b2 = await b2Res.json();
  const b3 = await b3Res.json();
  const elusJson = await elusRes.json();
  const circos = circoRes.ok ? parseCircos(await circoRes.text()) : [];
  const seen = new Set();
  const fiches = [];
  for (const f of [...(b1.fiches || []), ...(b2.fiches || []), ...(b3.fiches || [])]) {
    if (!f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    fiches.push(f);
  }
  return { meta: { version: "0.5", date: "2026-09-21", nbFiches: fiches.length }, fiches, elus: mergeElus(circos, elusJson.elus || []) };
}
function parseCircos(text) {
  const lines = text.trim().split(/\n/);
  const head = lines.shift().split(",");
  const i = (k) => head.indexOf(k);
  return lines.map((line) => {
    const c = []; let cur = "", q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { c.push(cur); cur = ""; continue; }
      cur += ch;
    }
    c.push(cur);
    const prenom = c[i("prenom")] || "";
    const nomF = c[i("nomFamille")] || c[i("nom")] || "";
    const dep = c[i("dep")] || c[i("departementNom")] || "";
    const code = c[i("code")] || c[i("departementCode")] || "";
    const n = c[i("circo")] || "";
    const an = c[i("an")] || c[i("id")] || "";
    return {
      id: slugId(prenom, nomF),
      prenom, nomFamille: nomF, nom: (prenom + " " + nomF).trim(),
      chambre: n ? "Assemblée nationale" : "Sénat",
      mandat: "Député",
      departement: dep, departementCode: code, circoNum: n ? +n : null,
      circonscription: n ? (dep + " — " + n + (n === "1" ? "re" : "e") + " circonscription") : dep,
      groupe: c[i("groupe")] || "", groupeCode: c[i("gcode")] || c[i("groupeAbrev")] || "",
      sourcesIdentite: an ? ["https://www.assemblee-nationale.fr/dyn/deputes/" + an] : [],
      constituLien: "https://www.constitu.fr/candidats",
      professionFoi: null
    };
  });
}
function slugId(prenom, nom) {
  return normalize((prenom || "") + "-" + (nom || "")).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function mergeElus(circos, rich) {
  const byId = new Map(circos.map((e) => [e.id, e]));
  for (const e of rich) byId.set(e.id, { ...(byId.get(e.id) || {}), ...e });
  return [...byId.values()];
}
function eluById(elus, id) { return elus.find((e) => e.id === id); }
function statutLabel(s) { if (s === "aligne") return "Aligné"; if (s === "oppose") return "Opposé"; return "Incomparable"; }
function voteLabel(v) { if (v === "pour") return "pour"; if (v === "contre") return "contre"; if (v === "abstention") return "abstention"; return v || "non votant"; }
function fmtDate(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }
function cardHTML(fiche, elu) {
  const blurb = (fiche.ceQueLeTexteFait || "").slice(0, 140);
  return `<a class="card" href="fiche.html?id=${encodeURIComponent(fiche.id)}">
    <div class="rail"><div><div class="vote-word">Vote</div><div class="vote-val">${voteLabel(fiche.voteElu)}</div></div>
    <span class="statut ${fiche.statut}">${statutLabel(fiche.statut)}</span></div>
    <div class="body"><div class="meta"><span>${elu ? elu.nom : ""}</span><span>${fiche.theme}</span><span>${fmtDate(fiche.scrutin.date)}</span></div>
    <h2>${fiche.scrutin.intitule}</h2><p>${blurb}${blurb.length >= 140 ? "…" : ""}</p></div></a>`;
}
function normalize(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function matchQuery(q, fiche, elu) {
  if (!q) return true;
  const hay = normalize([elu?.nom, elu?.circonscription, elu?.departement, elu?.departementCode, elu?.groupe, fiche.theme, fiche.scrutin.intitule, fiche.ceQueLeTexteFait].join(" "));
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
function matchElu(q, elu) {
  if (!q) return false;
  const hay = normalize([elu?.nom, elu?.circonscription, elu?.departement, elu?.departementCode, elu?.groupe, elu?.groupeCode, String(elu?.circoNum || "")].join(" "));
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
function eluCardHTML(elu, nbFiches) {
  return `<a class="card" href="elu.html?id=${encodeURIComponent(elu.id)}">
    <div class="rail"><div><div class="vote-word">${elu.departementCode || ""}</div><div class="vote-val">${elu.circoNum ? elu.circoNum + "e" : "—"}</div></div>
    <span class="statut ${nbFiches ? "aligne" : "incomparable"}">${nbFiches ? nbFiches + " fiche" + (nbFiches > 1 ? "s" : "") : "À rédiger"}</span></div>
    <div class="body"><div class="meta"><span>${elu.groupeCode || elu.groupe || ""}</span><span>${elu.departement || ""}</span></div>
    <h2>${elu.nom}</h2><p>${elu.circonscription || ""} · ${elu.groupe || ""}</p></div></a>`;
}
window.FT = { loadData, eluById, statutLabel, voteLabel, fmtDate, cardHTML, eluCardHTML, normalize, matchQuery, matchElu };
