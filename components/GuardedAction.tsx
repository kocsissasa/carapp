export default function GuardedAction({
  onAuthed,
  children,
}: { onAuthed: () => void; children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  const handle = () => {
    if (!token) { window.location.href = "/login"; return; }
    onAuthed();
  };
  return <button onClick={handle}>{children}</button>;
}
