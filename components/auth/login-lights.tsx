// A bejelentkezés hátterének díszei: pislákoló csillagok, hullócsillag és felszálló parázs a tartalom mögött
// (login-background fölött). Díszítés, a felolvasók kihagyják.

import Embers from "@/components/scene/embers";
import StarField from "@/components/scene/star-field";

export default function LoginLights() {
  return (
    <div aria-hidden className="login-lights">
      <StarField />
      <Embers />
    </div>
  );
}
