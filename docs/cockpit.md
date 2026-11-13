# Cockpit

Seit 13. November 2026 (Paket «Cockpit», Entscheid von Christian). Eine private Übersicht fürs Handy: wie viel ist öffentlich, welche Entscheide stehen an, was wartet auf Christian, was geht in den nächsten sechs Wochen hinaus, dazu das ganze Register nach Türen.

- **Quelle:** `src/register.json` (Tür, Status, `wartet`), `docs/cockpit/plan.json` (Entscheide und Wochen, von Hand zu pflegen), die Werke unter `b/lab/works/`.
- **Erzeugen:** `node tools/cockpit.mjs` schreibt `docs/cockpit/cockpit.html`.
- **Wo sie liegt:** nicht auf ornament.cloud (`docs/` ist vom Webspace ausgeschlossen). Claude veröffentlicht die Datei als privates Artefakt; nur Christian sieht es. Nach Änderungen am Register oder am Plan: neu erzeugen und dasselbe Artefakt neu veröffentlichen lassen.
- Die Haken bei «Entscheide» und «Wartet auf dich» merkt sich nur der Browser des Geräts. Erledigt ist etwas erst, wenn `wartet` im Register gelöscht bzw. der Punkt in `plan.json` gestrichen ist.
- Test: `tests/register.test.mjs` (Abschnitt Cockpit).
