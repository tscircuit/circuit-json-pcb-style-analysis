import { useMemo, useState } from "react"
import { analyzePcbStyle, createPcbStyleIssueArtifacts } from "../lib"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { realBoards } from "../tests/fixtures/real-boards"
export default function Gallery() {
  const [id, setId] = useState("abse-gameboy")
  const [layer, setLayer] = useState("")
  const board = realBoards.find((b) => b.id === id)!
  const analysis = useMemo(() => analyzePcbStyle(board.circuitJson), [board])
  const layers = [...new Set(analysis.issues.map((i) => i.layer))].sort()
  const artifacts = useMemo(
    () =>
      createPcbStyleIssueArtifacts(board.circuitJson, {
        analysis,
        layer: layer || undefined,
      }),
    [board, analysis, layer],
  )
  const issues = analysis.issues.filter((i) => !layer || i.layer === layer)
  const drawings = [
    renderPcbStyleSvg(board.circuitJson, issues, {
      layer: layer || undefined,
      title: board.name,
    }),
    ...artifacts.map((a) => a.content),
  ]
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
        {issues.length} errors. Each detail preserves surrounding copper from
        the complete board.
      </p>
      {drawings.map((svg, i) => (
        <img
          key={id + layer + i}
          loading="lazy"
          style={{
            width: "min(100%, 800px)",
            display: "block",
            marginBottom: 16,
          }}
          src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)}
          alt={
            i === 0 ? board.name + " overview" : artifacts[i - 1].issue.message
          }
        />
      ))}
    </main>
  )
}
