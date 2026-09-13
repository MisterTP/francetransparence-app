async function loadData() {
  const [fichesRes, elusRes] = await Promise.all([
    fetch("data/fiches.json"),
    fetch("data/elus.json")
  ]);
  const fichesJson = await fichesRes.json();
  const elusJson = await elusRes.json();
  return { meta: fichesJson.meta, fiches: fichesJson.fiches, elus: elusJson.elus };
}

function eluById(elus, id) {
  return elus.find((e) => e.id === id);
}

function statutLabel(s) {
  if (s === "aligne") return "Aligné";
  if (s === "oppose") return "Opposé";
  return "Incomparable";
}

function voteLabel(v) {
  if (v === "pour") return "pour";
  if (v === "contre") return "contre";
  if (v === "abstention") return "abstention";
  return v || "non votant";
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function cardHTML(fiche, elu) {
  return `<a class="card" href="fiche.html?id=${encodeURIComponent(fiche.id)}">
    <div class="meta">
      <span>${elu ? elu.nom : ""}</span>
      <span>${fiche.chambre}</span>
      <span>${fiche.theme}</span>
      <span class="statut ${fiche.statut}">${statutLabel(fiche.statut)}</span>
    </div>
    <h2>${fiche.scrutin.intitule}</h2>
    <p>${fmtDate(fiche.scrutin.date)} · vote ${voteLabel(fiche.voteElu)}</p>
  </a>`;
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchQuery(q, fiche, elu) {
  if (!q) return true;
  const hay = normalize([
    elu?.nom,
    elu?.circonscription,
    elu?.departement,
    elu?.departementCode,
    elu?.groupe,
    fiche.theme,
    fiche.scrutin.intitule,
    fiche.ceQueLeTexteFait
  ].join(" "));
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

window.FT = { loadData, eluById, statutLabel, voteLabel, fmtDate, cardHTML, normalize, matchQuery };
