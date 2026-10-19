// Social Media – Redaktion: Schreiben ins Repository über die Git-API von GitHub (seit 19. Oktober 2026).
// Ein Veröffentlichen ist genau ein Commit auf den Zweig der Website (Bilder als Blobs, Texte direkt im Baum); GitHub Pages stellt ihn
// nach etwa einer Minute online. Der Schlüssel ist ein «fine-grained personal access token», nur für dieses Repository, mit «Contents: Read and write».
const API = "https://api.github.com";

export class GitHubFehler extends Error {
  constructor(status, text) { super(text); this.status = status; }
}

/** Base64 eines Byte-Arrays (in Stücken, damit grosse Videos den Stapel nicht sprengen) */
export function base64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** SHA-1 eines Git-Blobs («blob <Länge>\0<Inhalt>»): so erkennt man unveränderte Dateien, ohne sie zu holen */
export async function blobSha(inhalt) {
  const bytes = typeof inhalt === "string" ? new TextEncoder().encode(inhalt) : inhalt;
  const kopf = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const alles = new Uint8Array(kopf.length + bytes.length);
  alles.set(kopf); alles.set(bytes, kopf.length);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", alles));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class GitHub {
  constructor({ schluessel, repo = "hansnoed-ui/ornament-cloud", zweig = "main", fetch: f = globalThis.fetch.bind(globalThis) }) {
    Object.assign(this, { schluessel, repo, zweig, f });
  }

  async anfrage(methode, pfad, body, { roh = false } = {}) {
    const antwort = await this.f(`${API}/repos/${this.repo}${pfad}`, {
      method: methode,
      headers: {
        Authorization: `Bearer ${this.schluessel}`,
        Accept: roh ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!antwort.ok) {
      let text = "";
      try { text = (await antwort.json()).message ?? ""; } catch {}
      throw new GitHubFehler(antwort.status, erklaeren(antwort.status, text));
    }
    return roh ? antwort.text() : antwort.status === 204 ? null : antwort.json();
  }

  /** Zugang prüfen: gibt es das Repository, und darf der Schlüssel schreiben? */
  async pruefen() {
    const r = await this.anfrage("GET", "");
    if (r.permissions && !r.permissions.push) throw new GitHubFehler(403, "Der Schlüssel darf das Repository lesen, aber nicht schreiben (Contents: Read and write fehlt).");
    return { name: r.full_name, zweig: this.zweig };
  }

  /** eine Textdatei vom Zweig (null, wenn es sie nicht gibt) */
  async lesen(pfad) {
    try { return await this.anfrage("GET", `/contents/${pfad.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(this.zweig)}`, null, { roh: true }); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }

  /** Stand des Zweigs: Commit, Baum und alle Dateien unter einem Präfix mit ihrer Blob-SHA */
  async stand(praefix = "") {
    const ref = await this.anfrage("GET", `/git/ref/heads/${encodeURIComponent(this.zweig)}`);
    const commit = await this.anfrage("GET", `/git/commits/${ref.object.sha}`);
    const baum = await this.anfrage("GET", `/git/trees/${commit.tree.sha}?recursive=1`);
    const dateien = new Map(baum.tree.filter((t) => t.type === "blob" && t.path.startsWith(praefix)).map((t) => [t.path, t.sha]));
    return { commit: ref.object.sha, baum: commit.tree.sha, dateien, vollstaendig: !baum.truncated };
  }

  /**
   * ein Commit: schreiben = Map(Pfad → Text oder Uint8Array), loeschen = [Pfad]; unveränderte Dateien fallen weg.
   * Liefert die SHA des neuen Commits oder null, wenn sich nichts ändert. Ist der Zweig inzwischen weiter, GitHubFehler mit status 409.
   */
  async commit({ stand, schreiben, loeschen = [], nachricht, fortschritt = () => {} }) {
    const eintraege = [];
    const binaer = [];
    for (const [pfad, inhalt] of schreiben) {
      if (stand.dateien.get(pfad) === await blobSha(inhalt)) continue;
      if (typeof inhalt === "string") eintraege.push({ path: pfad, mode: "100644", type: "blob", content: inhalt });
      else binaer.push([pfad, inhalt]);
    }
    let n = 0;
    const hochladen = async ([pfad, bytes]) => {
      const blob = await this.anfrage("POST", "/git/blobs", { content: base64(bytes), encoding: "base64" });
      eintraege.push({ path: pfad, mode: "100644", type: "blob", sha: blob.sha });
      fortschritt(`Hochgeladen: ${++n} von ${binaer.length} Dateien`);
    };
    for (let i = 0; i < binaer.length; i += 3) await Promise.all(binaer.slice(i, i + 3).map(hochladen));
    for (const pfad of loeschen) if (stand.dateien.has(pfad)) eintraege.push({ path: pfad, mode: "100644", type: "blob", sha: null });
    if (!eintraege.length) return null;
    const baum = await this.anfrage("POST", "/git/trees", { base_tree: stand.baum, tree: eintraege });
    const commit = await this.anfrage("POST", "/git/commits", { message: nachricht, tree: baum.sha, parents: [stand.commit] });
    try {
      await this.anfrage("PATCH", `/git/refs/heads/${encodeURIComponent(this.zweig)}`, { sha: commit.sha, force: false });
    } catch (e) {
      if (e.status === 422) throw new GitHubFehler(409, "Der Zweig hat sich inzwischen verändert.");
      throw e;
    }
    return commit.sha;
  }
}

function erklaeren(status, text) {
  if (status === 401) return "GitHub kennt den Schlüssel nicht (abgelaufen oder falsch kopiert).";
  if (status === 403 && /rate limit/i.test(text)) return "GitHub bremst: zu viele Anfragen. In ein paar Minuten noch einmal.";
  if (status === 403) return `GitHub verweigert den Zugriff: ${text || "dem Schlüssel fehlt das Recht «Contents: Read and write» für dieses Repository"}.`;
  if (status === 404) return "Repository oder Zweig nicht gefunden – oder der Schlüssel gilt nicht für dieses Repository.";
  if (status === 409) return "Der Zweig hat sich inzwischen verändert.";
  if (status === 422) return `GitHub lehnt die Änderung ab: ${text}`;
  return `GitHub antwortet mit ${status}${text ? `: ${text}` : ""}.`;
}
