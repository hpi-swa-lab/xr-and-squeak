import { h } from "../../view/widgets.js";
import specExport from "../../assets/tla2PCExport.json" assert {type: "json"}
import { useCallback, useState } from "../../external/preact-hooks.mjs";
// TODO install via npm?
import htm from '../../external/htm.mjs';
import { Component, createRef } from "../../external/preact.mjs";
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

const Lifeline = ({ numRows, column }) => {
    const lifelineStyle = {
        gridColumn: column,
        gridRow: `2 / span ${numRows}`,
        width: "50%",
        height: "100%",
        borderRight: "1px solid grey",
    }

    return html`<div style=${lifelineStyle}></div>`
}

const gridElementStyle = (column, row) => ({
    gridColumn: `${column}`,
    gridRow: `${row}`,
    textAlign: "center",
})

const Actor = ({ row, col, label }) => {
    const actorStyle = {
        ...gridElementStyle(col, row),
        fontWeight: 600,
        padding: "16px 16px",
        borderRadius: "4px",
        backgroundColor: "#eee",
        border: "1px solid gray",
        margin: "0 8px",
        width: "fit-content",
        justifySelf: "center",
    }

    return html`
    <div style=${actorStyle}>${label}</div>
    `
}

const actionLineWidth = 3
/** an action is the point where the diagram's lifeline is activated */
const Action = ({ row, col, label, msgs }) => {
    const boxStyle = {
        ...gridElementStyle(col, row),
        width: `${actionLineWidth}%`,
        height: "max(100%, 24px)",
        border: "1px solid gray",
        backgroundColor: "#eee",
        marginLeft: "calc(50% - 1.5%)",
    }

    const labelStyle = {
        position: "absolute",
        transform: "translateY(60%)",
        whiteSpace: "nowrap",
        marginLeft: "12px",
    }

    return html`
        <div style=${boxStyle}>
            <div style=${labelStyle}>${label}</div>
        </div>`
}

class Message extends Component {
    refFrom = createRef()
    refTo = createRef()

    componentDidMount() {
        if (!this.refFrom.current || !this.refTo.current) {
            console.error("ref not set")
            return
        }

        const { top: xFrom, left: yFrom, width: widthFrom, height: heightFrom } = this.refFrom.current.getBoundingClientRect()
        const { top: xTo, left: yTo, width: widthTo, height: heightTo } = this.refTo.current.getBoundingClientRect()

        const xFromCenter = xFrom + widthFrom / 2
        const xToCenter = xTo + widthTo / 2
        const yFromCenter = yFrom + heightFrom / 2
        const yToCenter = yTo + heightTo / 2

        const newState = { xFrom: xFromCenter, yFrom: yFromCenter, xTo: xToCenter, yTo: yToCenter }
        this.setState(newState)
        this.props.addLine({ ...newState, label: this.props.label })
    }

    render({ fromCol, toCol, row, label, addLine }) {
        return html`
            <div ref=${this.refFrom} style=${gridElementStyle(fromCol, row)}></div>
            <div ref=${this.refTo} style=${gridElementStyle(toCol, row)}></div>
            `
    }
}

const MsgLine = ({ xFrom, yFrom, xTo, yTo }) => {
    const lineStyle = { stroke: "black", strokeWidth: 2 }

    return html`
    <line x1=${xFrom} y1=${yFrom} x2=${xTo} y2=${yTo} style=${lineStyle} />`
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
    /** actor to column map */
    const a2c = actors.reduce((acc, a, i) => acc.set(a, i + 1), new Map())

    const vizData = prevEdges.map(e => edgeToVizData(e, varToActor))

    const gridWrapperStyle = {
        display: "grid",
        width: "100%",
        gridTemplateColumns: `repeat(${actors.length}, 1fr)`,
        gridTemplateRows: `repeat(${vizData.length + 1}, 1fr)`,
        //height: "100%",
    }

    const [lines, setLines] = useState([])
    const addLine = (line) => setLines([...lines, line])
    const svgStyle = {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        //transform: `translateX(${xOffset}%)`
    }

    // TODO: do we need refs for the lines? or can we just infer them from the grid?
    // the problem with the svg element is that the viewbox starts at 0,0, so we need to translate the lines, or set the viewbox to the grid
    // but then we need to know the size of the grid, which we don't know until it's rendered

    return [
        html`
        <div style=${gridWrapperStyle}>
            ${actors.map(a => html`<${Actor} label=${a} col=${a2c.get(a)} row=${1} />`)}
            ${actors.map(a => html`<${Lifeline} numRows=${vizData.length} column=${a2c.get(a)} />`)}
            ${vizData.map((d, i) => html`<${Action} row=${i + 2} col=${a2c.get(d.actor)} ...${d}/>`)}
            ${vizData.map(({ actor, msgs }, i) => msgs.map(m => html`<${Message} row=${i + 2} fromCol=${a2c.get(actor)} toCol=${a2c.get(m.to)} label=${m.type} addLine=${addLine} />`))}
        </div>
        <svg style=${svgStyle}>
            ${lines.map(({ xFrom, yFrom, xTo, yTo, label }) => html`<${MsgLine} xFrom=${xFrom} yFrom=${yFrom} xTo=${xTo} yTo=${yTo} />`)}
        </svg>
        `,
    ]
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
                <button 
                    style=${buttonStyle}
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