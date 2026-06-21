import { Navigate, useParams, useSearchParams } from "react-router-dom";

/** Legacy /bank and /pack/:packId URLs → merged practice hub. */
export default function BrowseRedirect() {
  const { packId } = useParams();
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  if (packId) next.set("packId", packId);
  if (!next.get("exam")) next.set("exam", "NEET");
  const q = next.toString();
  return <Navigate to={`/practice${q ? `?${q}` : ""}#question-bank`} replace />;
}
