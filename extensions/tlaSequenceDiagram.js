import { h } from "../view/widgets.js";
import specExport from "../assets/tla2PCExport.json" assert {type: "json"}
import { useState } from "../external/preact-hooks.mjs";
// TODO install via npm?
import htm from 'https://esm.sh/htm';
const html = htm.bind(h);

/** succesively applies the list of keys to obj
 * @example
 * apply({"a": {"b": "result"}}, ["a", "b"]) // "result"
 * 
 * @param {any} obj 
 * @param {string[]} keys 
 * @returns any
 */
function apply(obj, keys) {
    const reversedKeys = [...keys].reverse()
    let result = obj
    while (reversedKeys.length > 0) {
        result = result[reversedKeys.pop()]

        if (result === undefined) {
            return undefined
        }
    }
    return result
}

/** gives all possible nested key sequences of varTree
 * 
 * @example
 * nestedKeys({msgs: true, rmState: {rm1: true}}) // [["msgs"] ["rmState", "rm1"]]
 * 
 * @param {any} varTree 
 * @returns {string[][]}
 */
function nestedKeys(varTree) {
    const keys = []

    const dfs = (obj, accessors) => {
        for (const k of Object.keys(obj)) {
            accessors.push(k)

            if (obj[k] === true) {
                keys.push([...accessors])
            } else {
                dfs(obj[k], accessors)
            }

            accessors.pop()
        }
    }

    dfs(varTree, [])

    return keys
}

/** transforms a list of edges to visual variables for the diagram
 * @returns {{
 *  label: string,
 *  actor: string,
 *  msgs: string[]
 * }}
 */
function edgeToVizData({ reads, readsDuringWrites, writes, label }, varToActor) {
    const writeKeys = nestedKeys(writes)
    const readKeys = nestedKeys(reads)
    const readsDuringWritesKeys = nestedKeys(readsDuringWrites)

    const keysActorPairsWrite = writeKeys.map(keys => ({ keys, actor: apply(varToActor, keys) }))
    const keysActorPairsRead = readKeys.map(keys => ({ keys, actor: apply(varToActor, keys) }))
    const keysActorPairsReadDuringWrite = readsDuringWritesKeys.map(keys => ({ keys, actor: apply(varToActor, keys) }))

    const keysActorPairs = [...keysActorPairsWrite, ...keysActorPairsRead, ...keysActorPairsReadDuringWrite]

    const freqs = {}
    keysActorPairs.forEach(({ actor }) => freqs[actor] ? freqs[actor] += 1 : freqs[actor] = 1)

    let actor = null
    let max = 0
    for (const [k, v] of Object.entries(freqs)) {
        if (v > max) {
            actor = k
            max = v
        }
    }

    return {
        label: label,
        actor,
        msgs: keysActorPairs
            .filter(pair => pair.actor !== actor)
            .map(p => ({ to: p.actor, type: keysActorPairsWrite.includes(p) ? "write" : "read" }))
    }
}

const Diagram = ({ graph, prevEdges, setPrevEdges }) => {
    const varToActor = {
        "tmState": "Transaction Manager",
        "tmPrepared": "Transaction Manager",
        "rmState": {
            "rm1": "RM 1",
            "rm2": "RM 2",
        },
        "msgs": "messages",
    }
    const actors = ["Transaction Manager", "messages", "RM 1", "RM 2"]

    const vizData = prevEdges.map(e => edgeToVizData(e, varToActor))

    return html`
    <table style=${{ tableLayout: "fixed", width: "100%" }}>
        <tr>${actors.map(a => html`<th>${a}</th>`)}</tr>
        ${vizData.map(({ label, actor, msgs }) => html`
            <tr>${actors.map(a => html`<td>${a === actor ? label : ""}</td>`)}</tr>`)}
    </table>`
}

const EdgePicker = ({ graph, currNode, setCurrNode, prevEdges, setPrevEdges }) => {
    const nextEdges = Object.entries(graph.outgoingEdges.get(currNode.id))

    const buttonStyle = {
        padding: "4px",
        margin: "4px"
    }

    return html`
        <div>
            ${nextEdges.map(([to, e]) => html`
                <button style=${buttonStyle}
                    onClick=${() => {
            setCurrNode(graph.nodes.get(to))
            setPrevEdges([...prevEdges, e])
        }}>
                    ${e.label + e.parameters}
                </button>`)}
        </div>`
}

const State = ({ graph, initNode }) => {
    const [currNode, setCurrNode] = useState(initNode)
    const [prevEdges, setPrevEdges] = useState([])

    return [
        html`<${Diagram} ...${{ graph, prevEdges, setPrevEdges }} />`,
        html`<${EdgePicker} ...${{ graph, currNode, setCurrNode, prevEdges, setPrevEdges }} />`
    ]
}

const GraphProvider = () => {
    // only do computation-heavy operations on whole graph once
    const nodesList = specExport.graph.filter(n => n.$type === "node" || n.$type === "init-node")
    const nodes = nodesList.reduce((acc, n) => acc.set(n.id, n), new Map())
    const edges = specExport.graph.filter(e => e.$type === "edge")
    const initNode = nodesList.find(n => n.$type === "init-node")

    const computeOutgoingEdges = () => {
        const m = new Map()
        for (const n of nodesList) {
            m.set(n.id, {})
        }

        for (const e of edges) {
            const outgoing = m.get(e.from)
            if (outgoing[e.to]) {
                continue
            }
            outgoing[e.to] = e
        }

        return m
    }
    const outgoingEdges = computeOutgoingEdges()

    const graph = { nodes, edges, outgoingEdges }

    return html`<${State} graph=${graph} initNode=${initNode}/>`
}

export const SequenceDiagram = () => {

    return html`<${GraphProvider} />`
}