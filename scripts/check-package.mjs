import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { setTimeout } from "node:timers/promises"

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
)

async function loadFromJscdn(version) {
  assert.match(version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  const url = `https://jscdn.tscircuit.com/${packageJson.name}/${version}/+esm`
  let lastError
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      assert.ok(response.ok, `jscdn returned ${response.status} for ${url}`)
      const source = await response.text()
      return await import(
        `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
      )
    } catch (error) {
      lastError = error
      if (attempt < 11) await setTimeout(5_000)
    }
  }
  throw lastError
}

const analyzer =
  process.argv[2] === "--jscdn"
    ? await loadFromJscdn(process.argv[3])
    : await import(packageJson.name)

assert.equal(typeof analyzer.analyzePcbStyle, "function")
assert.equal(typeof analyzer.renderPcbStyleSvg, "function")
assert.equal(typeof analyzer.PcbStyleAnalysisPipeline, "function")

const route = [{ route_type: "wire", x: 0, y: 0, width: 0.15, layer: "top" }]
for (let i = 0; i < 10; i++) {
  const previous = route.at(-1)
  route.push({
    ...previous,
    x: previous.x + (i % 2 === 0 ? 0 : 0.4),
    y: previous.y + 0.4,
  })
}
const circuitJson = [{ type: "pcb_trace", pcb_trace_id: "staircase", route }]
const analysis = analyzer.analyzePcbStyle(circuitJson)
assert.equal(analysis.issues.length, 1)
assert.equal(analysis.issues[0].lineItemType, "PcbTraceStaircase")
assert.match(
  analyzer.renderPcbStyleSvg(circuitJson, analysis.issues),
  /1 errors/,
)
assert.deepEqual(analyzer.analyzePcbStyle([]), { issues: [] })

if (process.argv[2] !== "--jscdn") {
  const subpath = await import(`${packageJson.name}/analysis`)
  assert.deepEqual(subpath.analyzePcbStyle(circuitJson), analysis)
}
console.log(
  `Verified ${packageJson.name} ${process.argv[3] ?? packageJson.version}`,
)
