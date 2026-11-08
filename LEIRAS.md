# MineScript

A MineScript egy böngészős játék, amelyben programot írunk egy bányászrobotnak. A cél, hogy a robot bejárja a pályát és minél több aranyat gyűjtsön össze. Saját térképet is készíthetünk, amit megoszthatunk másokkal, majd versenyezhetünk rajta.

## Hogyan lehet használni?

Az alkalmazás használatához először regisztrálni kell, majd bejelentkezni. A kezdőlapon kész pályák és a játékosok által közzétett térképek közül lehet választani. A helyi indítás lépéseit a [README.md](README.md) írja le.

Egy pályánál a Program írása gomb nyitja meg a kódszerkesztőt és a szimulátort. Itt saját programot írhatunk a kiválasztott pályához. Térképet fájlból is importálhatunk. A programok fájlból is megnyithatók, és exportálással elmenthetők.

A Futtatás gombbal indul a robot. Futás közben látható, melyik sort hajtja végre, hol jár, mit fedezett fel és mennyi aranyat gyűjtött. A program kiírásai a konzolban jelennek meg. A futást meg lehet állítani, lépésenként követni, és a sebességét is lehet állítani. Hibánál a felület megmutatja, hol és miért állt meg a program.

Saját pályát a kezdőlap Új fájl menüjéből lehet készíteni. A térképszerkesztőben beállítható a méret, majd falakat, aranyat és robotot helyezhetünk el. A térkép szövegesen is szerkeszthető, fájlból betölthető és fájlba menthető. Az elkészült pályát át lehet vinni a szimulátorba, vagy a Közzététel gombbal meg lehet osztani.

A közzétett pályák kártyájáról érhető el a ranglista. Előrébb kerül, aki több aranyat gyűjtött, azonos aranynál pedig az, akinek kevesebb feldolgozott programsor kellett hozzá. A saját névre vagy profilképre kattintva a fiók adatai és a felület nyelve módosítható. A szerkesztőből nyelvi dokumentáció is nyitható, magyarázatokkal és kipróbálható példákkal.

## Mi készült el, és mi maradt ki?

A fő funkciók elkészültek: lehet fiókot létrehozni, térképet és programot szerkeszteni, fájlokat betölteni és menteni, programot futtatni, valamint ranglistán versenyezni.

Ranglista csak közzétett pályákhoz tartozik, és játékosonként a legjobb eredményt tartjuk meg. Teljes futáselőzmény nem készült. A szerkesztett munkát a böngésző megőrzi, de másik eszközön nem tölti vissza automatikusan. Egy közzétett térkép módosítását új példányként kell megosztani. A bejelentkezéshez és a közösségi funkciókhoz internetkapcsolat szükséges.

## Milyen extrákat tettünk bele?

- **Idővonal:** vissza lehet nézni egy futás korábbi pillanatait, a robot helyével, a konzollal és a változókkal együtt.
- **Szellemrobot:** a szimulátorban bekapcsolva az első helyezett útját mutatja a saját robot mellett.
- **Kódszerkesztő:** színezéssel, kiegészítési javaslatokkal és hibamagyarázatokkal segít.
- **Közösség és profil:** a térképeket lehet kedvelni, a profil személyre szabható, és magyar vagy angol felület választható.

Telefonon a szerkesztők fülekre váltanak. A billentyűzetes használatra, az olvashatóságra és a csökkentett animációkra is figyeltünk.

## Milyen nehézségek voltak?

A legtöbb odafigyelést a MineScript szabályai igényelték. A szóközök, a behúzások és a ciklusok lépésszámítása miatt sok apró esetet kellett ellenőrizni. Ezekhez teszteket írtunk. A kiírás néhány helyen nem volt egyértelmű; az else behúzásánál például a benne szereplő mintaprogramot követtük.

A ranglistánál fontos volt, hogy ne a böngésző által küldött pontszámra hagyatkozzunk. Ezért a szerver ugyanazzal a motorral újrafuttatja a programot, és abból számolja az eredményt.

A felületet eleinte nehéz volt kis képernyőn használni, ezért a paneleket mobilon külön fülekre bontottuk. Az animációknál pedig külön kellett kezelni a látványt és a program végrehajtását, hogy a sebesség ne befolyásolja a pontozást.

## Mit fejlesztenénk még?

Jó lenne a programokat és a saját térképeket a fiókhoz menteni, hogy másik eszközön is folytatható legyen a munka. Később készülhetne teljes futáselőzmény és egy fokozatosan nehezedő feladatsor is.
