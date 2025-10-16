// Egy gomb, ami csak bejelentkezett usernek futtat akciót; különben /login-re visz
export default function GuardedAction({
  onAuthed, // -> callback: mit csináljunk, ha a user be van jelentkezve
  children,  // -> a gomb tartalma
}: { onAuthed: () => void; children: React.ReactNode }) {
  const token = localStorage.getItem("token");

  // Ha valaki közben be-/kijelentkezik, a korábban olvasott érték elavul.
  // Inkább a kattintás pillanatában kérdezzük le.
  const handle = () => {
    if (!token) { window.location.href = "/login"; return; } // -> ha nincs token → nem auth-olt user / irány a login oldal
    onAuthed();  // -> van token → futtathatjuk a védett akciót
  };
  // -> onClick: a fenti guard logikát hívjuk
  return <button onClick={handle}>{children}</button>;
}
