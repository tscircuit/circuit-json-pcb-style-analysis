import { useMemo, useState } from "react"
import { analyzePcbStyle } from "../lib"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { buildAnalysisContext } from "../lib/segments"
import { realBoards } from "../tests/fixtures/real-boards"
export default function Gallery() {
  const [id, setId] = useState("abse-gameboy")
  const [layer, setLayer] = useState("")
  const board = realBoards.find((b) => b.id === id)!
  const analysis = useMemo(() => analyzePcbStyle(board.circuitJson), [board])
  const layers = [
    ...new Set(
      buildAnalysisContext(board.circuitJson).segments.map((s) => s.layer),
    ),
  ].sort()
  const issues = analysis.issues.filter((i) => !layer || i.layer === layer)
  const svg = renderPcbStyleSvg(board.circuitJson, issues, {
    layer: layer || undefined,
    title: board.name + " — all style errors",
  })
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Real-board PCB style analysis</h1>
      <label>
        Board{" "}
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value)
            setLayer("")
          }}
        >
          {realBoards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        Layer{" "}
        <select value={layer} onChange={(e) => setLayer(e.target.value)}>
          <option value="">All layers</option>
          {layers.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <p>
        {issues.length} errors. Only segments longer than 5 mm and more than 4°
        from a multiple of 45° are highlighted.
      </p>
      <img
        key={id + layer}
        style={{ width: "min(100%, 800px)", display: "block" }}
        src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)}
        alt={board.name + " with all problematic trace segments highlighted"}
      />
    </main>
  )
}
