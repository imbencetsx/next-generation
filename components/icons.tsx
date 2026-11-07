// Pixeles ikonok (pixelarticons, MIT) egy helyen, a felület saját neveivel.
// A rajzok 24×24-es rácson vannak: a méretet a legközelebbi 12/16/20/24/48 px-re igazítjuk, és élesen rajzoljuk,
// hogy a vonalak ne mosódjanak el (12, 24 és 48 px minden kijelzőn pontos, 16 és 20 px Retinán).

import type { SVGProps } from "react";
import { ArrowBarRight } from "pixelarticons/react/ArrowBarRight.js";
import { AudioWaveform } from "pixelarticons/react/AudioWaveform.js";
import { BookOpen } from "pixelarticons/react/BookOpen.js";
import { Check as CheckGlyph } from "pixelarticons/react/Check.js";
import { ChevronDown as ChevronDownGlyph } from "pixelarticons/react/ChevronDown.js";
import { ChevronLeft as ChevronLeftGlyph } from "pixelarticons/react/ChevronLeft.js";
import { ChevronRight as ChevronRightGlyph } from "pixelarticons/react/ChevronRight.js";
import { Circle } from "pixelarticons/react/Circle.js";
import { Clock as ClockGlyph } from "pixelarticons/react/Clock.js";
import { Close } from "pixelarticons/react/Close.js";
import { Cloud } from "pixelarticons/react/Cloud.js";
import { Code as CodeGlyph } from "pixelarticons/react/Code.js";
import { Compass as CompassGlyph } from "pixelarticons/react/Compass.js";
import { Download as DownloadGlyph } from "pixelarticons/react/Download.js";
import { ExternalLink as ExternalLinkGlyph } from "pixelarticons/react/ExternalLink.js";
import { File } from "pixelarticons/react/File.js";
import { Globe as GlobeGlyph } from "pixelarticons/react/Globe.js";
import { Home as HomeGlyph } from "pixelarticons/react/Home.js";
import { Lock as LockGlyph } from "pixelarticons/react/Lock.js";
import { Map as MapGlyph } from "pixelarticons/react/Map.js";
import { Login as LoginGlyph } from "pixelarticons/react/Login.js";
import { Logout as LogoutGlyph } from "pixelarticons/react/Logout.js";
import { Pause as PauseGlyph } from "pixelarticons/react/Pause.js";
import { Pencil as PencilGlyph } from "pixelarticons/react/Pencil.js";
import { Play as PlayGlyph } from "pixelarticons/react/Play.js";
import { Plus } from "pixelarticons/react/Plus.js";
import { Reload } from "pixelarticons/react/Reload.js";
import { Scale as ScaleGlyph } from "pixelarticons/react/Scale.js";
import { Search as SearchGlyph } from "pixelarticons/react/Search.js";
import { Share as ShareGlyph } from "pixelarticons/react/Share.js";
import { SquareAlert } from "pixelarticons/react/SquareAlert.js";
import { TestTube as TestTubeGlyph } from "pixelarticons/react/TestTube.js";
import { TextWrap } from "pixelarticons/react/TextWrap.js";
import { Trash as TrashGlyph } from "pixelarticons/react/Trash.js";
import { Upload as UploadGlyph } from "pixelarticons/react/Upload.js";
import { UserPlus as UserPlusGlyph } from "pixelarticons/react/UserPlus.js";
import { WarningDiamond } from "pixelarticons/react/WarningDiamond.js";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number };
type Glyph = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

// A 48 px a 24-es rács pontos kétszerese: nagy, díszítő ikonokhoz (pl. a kezdőlap belépési pontjai).
const GRID_SIZES = [12, 16, 20, 24, 48];
// Döntetlennél a nagyobbat választjuk (14 → 16), hogy a kis ikonok ne zsugorodjanak olvashatatlanra.
const snap = (size: number) =>
  GRID_SIZES.reduce((best, step) => (Math.abs(step - size) <= Math.abs(best - size) ? step : best));

function pixelIcon(Glyph: Glyph, name: string) {
  function Icon({ size, ...props }: IconProps) {
    const px = size === undefined ? undefined : snap(size);
    // Méret nélkül a szülő (pl. gomb) CSS-e adja a méretet.
    return (
      <Glyph width={px ?? 20} height={px ?? 20} shapeRendering="crispEdges" aria-hidden focusable="false" {...props} />
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const Alert = pixelIcon(SquareAlert, "Alert");
export const Book = pixelIcon(BookOpen, "Book");
export const Check = pixelIcon(CheckGlyph, "Check");
export const ChevronDown = pixelIcon(ChevronDownGlyph, "ChevronDown");
export const ChevronLeft = pixelIcon(ChevronLeftGlyph, "ChevronLeft");
export const ChevronRight = pixelIcon(ChevronRightGlyph, "ChevronRight");
export const Clock = pixelIcon(ClockGlyph, "Clock");
export const Code = pixelIcon(CodeGlyph, "Code");
export const Compass = pixelIcon(CompassGlyph, "Compass");
export const Cross = pixelIcon(Close, "Cross");
export const Download = pixelIcon(DownloadGlyph, "Download");
export const ExternalLink = pixelIcon(ExternalLinkGlyph, "ExternalLink");
export const FileIcon = pixelIcon(File, "FileIcon");
export const Fog = pixelIcon(Cloud, "Fog");
export const Globe = pixelIcon(GlobeGlyph, "Globe");
export const Home = pixelIcon(HomeGlyph, "Home");
export const Idle = pixelIcon(Circle, "Idle");
export const Lock = pixelIcon(LockGlyph, "Lock");
export const MapIcon = pixelIcon(MapGlyph, "MapIcon");
export const Login = pixelIcon(LoginGlyph, "Login");
export const Logout = pixelIcon(LogoutGlyph, "Logout");
export const NewFile = pixelIcon(Plus, "NewFile");
export const Pause = pixelIcon(PauseGlyph, "Pause");
export const Pencil = pixelIcon(PencilGlyph, "Pencil");
export const Play = pixelIcon(PlayGlyph, "Play");
export const Reset = pixelIcon(Reload, "Reset");
export const Running = pixelIcon(AudioWaveform, "Running");
export const Scale = pixelIcon(ScaleGlyph, "Scale");
export const Search = pixelIcon(SearchGlyph, "Search");
export const Share = pixelIcon(ShareGlyph, "Share");
export const StepForward = pixelIcon(ArrowBarRight, "StepForward");
export const TestTube = pixelIcon(TestTubeGlyph, "TestTube");
export const Trash = pixelIcon(TrashGlyph, "Trash");
export const Upload = pixelIcon(UploadGlyph, "Upload");
export const UserPlus = pixelIcon(UserPlusGlyph, "UserPlus");
export const Warning = pixelIcon(WarningDiamond, "Warning");
export const Wrap = pixelIcon(TextWrap, "Wrap");
