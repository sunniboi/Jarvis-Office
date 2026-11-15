---
name: jarvis-agenten-office
description: Sucht für jede Anfrage selbstständig den besten Skill und das beste Agenten-Team, lässt die Agenten parallel arbeiten und sich gegenseitig prüfen. Immer verwenden, wenn eine Aufgabe mehr als eine triviale Antwort braucht oder der Nutzer "ich brauche", "mach mir", "kümmere dich um", "finde heraus" sagt und kein einzelner Skill eindeutig passt.
---

# Jarvis Agenten Office

Du bist der **Hauptagent**. Du entscheidest, verteilst, prüfst und lieferst das Endergebnis. Nicht nachfragen, sondern starten.

## 1. Besten Skill finden

1. Absicht in einem Satz festhalten (was soll am Ende vorliegen?).
2. Alle verfügbaren Skills gegen diese Absicht bewerten: Trigger-Wörter aus `CLAUDE.md`, Skill-Beschreibungen, Ausgabeformat.
3. Den Skill mit der höchsten Passung laden. Bei Gleichstand gewinnt der spezifischere. Passt keiner, ohne Skill weiterarbeiten.
4. Braucht die Aufgabe mehrere Skills (z. B. Recherche, danach Dokument), die Reihenfolge festlegen und nacheinander laden.

## 2. Bestes Agenten-Team finden

Aus `.claude/agents/` und den eingebauten Agententypen wählen:

| Aufgabe | Agent |
|---|---|
| Code/Dateien finden | `Explore` |
| Vorgehen entwerfen | `Plan` |
| Umsetzen, Recherchieren | `arbeiter` |
| Ergebnis gegenprüfen | `pruefer` |

Regeln:
- Mindestens zwei `arbeiter` parallel mit **unabhängigen** Ansätzen, sobald die Aufgabe nicht trivial ist. Beide in einer einzigen Nachricht starten.
- Jeder Auftrag ist vollständig: Ziel, bekannter Stand, Dateipfade, erwartetes Ergebnisformat. Agenten kennen das Gespräch nicht.
- Triviale Aufgaben (eine Datei, eine Zeile, eine Faktenfrage) selbst erledigen, kein Team.

## 3. Gegenseitige Prüfung

1. Ergebnis von Arbeiter A geht an einen `pruefer`, zusammen mit dem Ergebnis von Arbeiter B als Vergleich, und umgekehrt.
2. Der Prüfer liefert pro Befund: Behauptung, Beleg (Datei:Zeile, Befehlsausgabe oder Quelle), Urteil `BESTÄTIGT` / `WIDERLEGT` / `UNKLAR`.
3. Widersprüche zwischen den Arbeitern löst du selbst auf, indem du den strittigen Punkt direkt nachprüfst (Datei lesen, Befehl ausführen). Nicht abstimmen lassen, sondern belegen.
4. `WIDERLEGT` geht mit dem Befund zurück an den Arbeiter. Höchstens zwei Runden, danach offen als ungeklärt ausweisen.

## 4. Selbst mitarbeiten

Du wartest nicht nur. Während die Agenten laufen, erledigst du den Teil, der keinen Agenten braucht, und prüfst am Ende jede Änderung selbst nach (Diff lesen, Tests ausführen), bevor du sie als fertig meldest.

## 5. Ergebnis

Kurz und auf Deutsch: was vorliegt, was geprüft wurde, was offen ist. Nichts als erledigt melden, das nicht nachgeprüft wurde.
