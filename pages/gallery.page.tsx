import { useState } from "react"
import { analyzePcbStyle, createPcbStyleIssueArtifacts } from "../lib"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { cases } from "../tests/fixtures/cases"
export default function Gallery() {
  const [name, setName] = useState("multiSegment")
  const cj = cases[name]
  const analysis = analyzePcbStyle(cj)
  const artifacts = createPcbStyleIssueArtifacts(cj, { analysis })
  const drawings = [
    renderPcbStyleSvg(cj, analysis.issues),
    ...artifacts.map((a) => a.content),
  ]
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>PCB style analysis</h1>
      <select value={name} onChange={(e) => setName(e.target.value)}>
        {Object.keys(cases).map((key) => (
          <option key={key}>{key}</option>
        ))}
      </select>
      <p>
        {analysis.issues.length} errors. Red segments identify the issue; detail
        drawings show one issue at a time.
      </p>
      {drawings.map((svg, i) => (
        <img
          key={i}
          style={{
            width: "min(100%, 800px)",
            display: "block",
            marginBottom: 16,
          }}
          src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)}
          alt={i === 0 ? "Board overview" : artifacts[i - 1].issue.message}
        />
      ))}
      <pre>{JSON.stringify(analysis, null, 2)}</pre>
    </main>
  )
}
