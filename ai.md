> Ez a fájl azt írja le hogy mihez használtunk AI-t és hogy miért döntöttünk így.
> Itt elmagyarázzuk hogy milyen modelleket használtunk és miért.

---


**Modellek:** Claude Opus 5.5, GPT 6.1 Sol, Gemini 3.8 Flash
**AI Eszközök:** Claude Code, Codex, Cursor összehangolva T3Code-val

## Használatunk körülbelűl ebből állt:

[x] Tab Autocomplete => Cursor (Ez nagyon sokat segített)
[x] Frontend UI bugok javítása => Claude Opus 5.5
[x] Design összehangolása => Claude Opus 5.5
[x] Kód Review => GPT 6.1 Sol
[x] Tesztek írása => GPT 6.1 Sol
[x] Dokumentációk megértése => Gemini 3.8 Flash
[x] Tesztek futtatása => Gemini 3.8 Flash
[x] Pár komment megfogalmazása => Gemini 3.8 Flash


A modelleket előzetes tapasztalatunk alapján megpróbáltuk úgy használni hogy mindegyiknek adtunk egy szerepet már előzetesen. Kijelöltük hogy az Opus 5.5 modell jó abban hogy egy létező UI-t összehangol. GPT 6.1 Sol: Jó codebasek logikája megértésében. Gemini 3.8 Flash: Meglepően értehetően ír és nagyon jól magyaráz el nehezebb dolgokat

Úgy vettük észre hogy ezzel a megoldással mind gyorsan megismertük a projektet.

## Esetek amikor az Ai nem végezte jól a dolgát:

- Nem gondolkozik kreatívan: Amikor a backendet megpróbáltuk elmagyarázni neki akkor sokszor ugyanabba a végpontba jutottunk el; Az Ai modellek nem tudtak a dobozon kívül gondolkodni. Egyszerűen nem értette meg a szintaktikát mert nem magyaráztuk el neki olyan pontosan hogy egy nyelvet felíépítsen belőle. Ezt saját beavatkozásunkkal tudtuk megoldani.
- Tesztek írásakor 2 esetben olyan teszteket írt ami lehetetlen volt. Ezt csak kitöröltük

## Az 5 eset, ami a legtöbbet segített

1. **Tesztek a kiírásból:** a PDF minden szabályából teszt lett, így az interpreter pontosan a kiírás szerint működik.
2. **Közös motor:** a szerver ugyanazzal a kóddal futtatja újra a programot, így a ranglista nem csalható.
3. **Időutazás:** a motor pillanatképeire építve gyorsan elkészült az idővonal, amivel a futás visszanézhető.
4. **Mobilnézet:** a szerkesztők fülekre bontása egy lépésben, az asztali nézet érintése nélkül készült el.
5. **Hibakeresés:** a kijelölési kontraszthibát böngészőben mérve találta meg, és célzottan javította.
