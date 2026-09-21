async function loadData() {
  const v = "20260921g";
  const [b1Res, b2Res, b3Res, elusRes] = await Promise.all([
    fetch("data/batch-1.json?v=" + v),
    fetch("data/batch-2.json?v=" + v),
    fetch("data/batch-3.json?v=" + v),
    fetch("data/elus.json?v=" + v)
  ]);
  if (!b1Res.ok || !b2Res.ok || !b3Res.ok || !elusRes.ok) throw new Error("données");
  const b1 = await b1Res.json();
  const b2 = await b2Res.json();
  const b3 = await b3Res.json();
  const elusJson = await elusRes.json();
  const seen = new Set();
  const fiches = [];
  for (const f of [...(b1.fiches || []), ...(b2.fiches || []), ...(b3.fiches || [])]) {
    if (!f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    fiches.push(f);
  }
  return { meta: { version: "0.5", date: "2026-09-21", nbFiches: fiches.length }, fiches, elus: elusJson.elus };
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
    <h2>${fiche.scrutin.intitule}</h2>
    <p>${blurb}${blurb.length >= 140 ? "…" : ""}</p></div></a>`;
}
function normalize(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function matchQuery(q, fiche, elu) {
  if (!q) return true;
  const hay = normalize([elu?.nom, elu?.circonscription, elu?.departement, elu?.departementCode, elu?.groupe, fiche.theme, fiche.scrutin.intitule, fiche.ceQueLeTexteFait].join(" "));
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
window.FT = { loadData, eluById, statutLabel, voteLabel, fmtDate, cardHTML, normalize, matchQuery };
