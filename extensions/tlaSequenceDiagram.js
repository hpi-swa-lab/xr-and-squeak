import { h } from "../view/widgets.js";
import specExport from "../assets/tla2PCExport.json" assert {type: "json"}
import { useState } from "../external/preact-hooks.mjs";
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

    return [
        h(
            "table",
            {
                style: {
                    tableLayout: "fixed",
                    width: "100%"
                }
            },
            h("tr", {}, actors.map(a => h("th", {}, a))),
            prevEdges
                .map(e => edgeToVizData(e, varToActor))
                .map(({ label, actor, msgs }) =>
                    h("tr", {},
                        actors.map(a =>
                            h("td", {}, a === actor ? label : "")
                        )
                    )
                )
        )
    ]
}

const EdgePicker = ({ graph, currNode, setCurrNode, prevEdges, setPrevEdges }) => {
    const nextEdges = Object.entries(graph.outgoingEdges.get(currNode.id))

    return [
        h("div",
            {},
            nextEdges.map(([to, e]) => h(
                "button",
                {
                    onClick: () => {
                        setCurrNode(graph.nodes.get(to))
                        setPrevEdges([...prevEdges, e])
                    },
                    style: {
                        padding: "4px",
                        margin: "4px"
                    }
                },
                `${e.label + e.parameters}`))
        )
    ]
}

const State = ({ graph, initNode }) => {
    const [currNode, setCurrNode] = useState(initNode)
    const [prevEdges, setPrevEdges] = useState([])

    return [
        h(Diagram, { graph, prevEdges, setPrevEdges }),
        h(EdgePicker, { graph, currNode, setCurrNode, prevEdges, setPrevEdges })
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

    return [
        h(State, { graph, initNode })
    ]
}

export const SequenceDiagram = () => {

    return [
        h(GraphProvider, {}),
    ];
}