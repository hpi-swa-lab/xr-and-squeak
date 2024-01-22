import { h } from "../../view/widgets.js";
import specExport from "../../assets/tla2PCExport.json" assert {type: "json"}
import { useCallback, useEffect, useRef, useState } from "../../external/preact-hooks.mjs";
// TODO install via npm?
import htm from '../../external/htm.mjs';
import { Component, createRef } from "../../external/preact.mjs";
const html = htm.bind(h);

// TODO put this data in some global state accessible to all components
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

    const keysActorPairsToMsg = (p) => {
        const type = keysActorPairsWrite.includes(p) ? "write" : "read"
        const object = p.keys.reduce((acc, k) => acc + "." + k)
        return { to: p.actor, type: type, label: `${type} ${object}` }
    }

    return {
        label: label,
        actor,
        msgs: keysActorPairs
            .filter(pair => pair.actor !== actor)
            .map(keysActorPairsToMsg)
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
        height: "min-content",
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
        height: `calc(2em * ${msgs.length + 1})`,
        border: "1px solid gray",
        backgroundColor: "#eee",
        marginLeft: "calc(50% - 1.5%)",
        marginTop: "12px",
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

class LinePositioning extends Component {
    refFrom = createRef()
    refTo = createRef()

    componentDidMount() {
        if (!this.refFrom.current || !this.refTo.current) {
            console.error("ref not set")
            return
        }

        const yOffsetFrom = this.refFrom.current.offsetTop
        const xOffsetFrom = this.refFrom.current.offsetLeft
        const yOffsetTo = this.refTo.current.offsetTop
        const xOffsetTo = this.refTo.current.offsetLeft

        const { width: widthFrom, height: heightFrom } = this.refFrom.current.getBoundingClientRect()

        const xOffsetCenter = (widthFrom / 2)
        // in action we have a top margin of 12px such that there's some gap between
        // successive actions, which we need to account for
        const delayOffset = 12
        const yOffset = (heightFrom - delayOffset) * this.props.yRelativePosition


        const line = {
            xFrom: xOffsetFrom + xOffsetCenter,
            yFrom: yOffsetFrom + yOffset + delayOffset,
            xTo: xOffsetTo + xOffsetCenter,
            yTo: yOffsetTo + yOffset + delayOffset,
            label: this.props.label
        }

        this.props.addLine(line)
    }

    /** yRelativePosition is the percentage [0,1] where the message starts and ends */
    render({ fromCol, toCol, row, label, addLine, yRelativePosition }) {
        return html`
            <div ref=${this.refFrom} style=${gridElementStyle(fromCol, row)}></div>
            <div ref=${this.refTo} style=${gridElementStyle(toCol, row)}></div>
            `
    }
}

/** a svg container with viewbox according to the global viewport */
const MessageArrows = ({ lines, numCols, numRows }) => {
    const svgStyle = {
        position: "absolute",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    }

    const lineStyle = {
        stroke: "black",
        strokeWidth: 2,
        markerEnd: "url(#arrow)",
    }

    const textStyle = {
        textAnchor: "middle",
        stroke: "white",
        strokeWidth: 4,
        paintOrder: "stroke",
    }

    return html`
    <svg style=${svgStyle}>
            <defs>
                <!-- arrowhead, src: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker -->
                <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
        </defs>
        <!-- add line and text in the middle of it -->
        ${lines.map(({ xFrom, yFrom, xTo, yTo, label }) => html`
        <g>
            <text style=${textStyle} x=${xFrom + (xTo - xFrom) / 2} y=${yFrom + (yTo - yFrom) / 2 - 8}>${label}</text>
            <line style=${lineStyle} x1=${xFrom} y1=${yFrom} x2=${xTo} y2=${yTo} />
        </g>
        `)}
    </svg>`
}

const MessagesPositionsCompution = ({ vizData, addLine }) => {

    // depending on if messages are read or write messages,
    // they are placed on top (reads) or bottom (writes) of the lifeline
    const computeMessagePositions = ({ actor, msgs }, i) => {
        const row = i + 2

        const readMsgs = msgs.filter(m => m.type !== "write")
        const writeMsgs = msgs.filter(m => m.type === "write")

        const readMsgPositions = readMsgs.map((m, j) => {
            const fromCol = a2c.get(m.to)
            const toCol = a2c.get(actor)
            // reads start at the beginning up to the middle
            const yRelativePosition = j / readMsgs.length / 2
            return { fromCol, toCol, row, label: m.label, yRelativePosition }
        })

        const writeMsgPositions = writeMsgs.map((m, j) => {
            const fromCol = a2c.get(actor)
            const toCol = a2c.get(m.to)
            // writes start at the end up to the middle
            const yRelativePosition = 1.0 - j / writeMsgs.length / 2
            return { fromCol, toCol, row, label: m.label, yRelativePosition }
        })

        return [...readMsgPositions, ...writeMsgPositions]
    }

    return vizData
        .flatMap(computeMessagePositions)
        .map((p) => html`<${LinePositioning} ...${p} addLine=${addLine} />`)
}


const Diagram = ({ graph, prevEdges, setPrevEdges }) => {
    const vizData = prevEdges.map(e => edgeToVizData(e, varToActor))

    const gridWrapperStyle = {
        position: "relative", // necessary for relative positioning of messages to this element
        display: "grid",
        width: "100%",
        gridTemplateColumns: `repeat(${actors.length}, 1fr)`,
    }

    const [lines, setLines] = useState([])
    const addLine = (line) => setLines([...lines, line])

    return [
        html`
        <div style=${gridWrapperStyle}>
            ${actors.map(a => html`<${Actor} label=${a} col=${a2c.get(a)} row=${1} />`)}
            ${actors.map(a => html`<${Lifeline} numRows=${vizData.length + 1} column=${a2c.get(a)} />`)}
            ${vizData.map((d, i) => html`<${Action} row=${i + 2} col=${a2c.get(d.actor)} ...${d}/>`)}
            <${MessagesPositionsCompution} vizData=${vizData} addLine=${addLine} />
            <${MessageArrows} lines=${lines} numCols=${actors.length} numRows=${vizData.length + 1} />
            <!-- last row with fixed height to still show some of the lifeline -->
            ${actors.map((_, i) => html`<div style=${{ ...gridElementStyle(i + 1, vizData.length + 2), height: "32px" }}></div>`)}
        </div>
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