import { h } from "../../view/widgets.js";
import ewd998Small from "../../assets/JsonStateWriter.json" assert {type: "json"}
import specExport from "../../assets/tla2PCExport.json" assert {type: "json"}
import { useCallback, useEffect, useRef, useState } from "../../external/preact-hooks.mjs";
import htm from '../../external/htm.mjs';
import { Component, createRef } from "../../external/preact.mjs";
const html = htm.bind(h);

// TODO put this data in some global state accessible to all components
const varToActor2 = {
    "tmState": "Transaction Manager",
    "tmPrepared": "Transaction Manager",
    "rmState": {
        "rm1": "RM 1",
        "rm2": "RM 2",
    },
    "msgs": "messages",
}
const actors2 = ["Transaction Manager", "messages", "RM 1", "RM 2"]


const varToActor = {
    "color": {
        "0": "Node 0",
        "1": "Node 1",
        "2": "Node 2"
    },
    "pending": {
        "0": "Node 0",
        "1": "Node 1",
        "2": "Node 2"
    },
    "active": {
        "0": "Node 0",
        "1": "Node 1",
        "2": "Node 2"
    },
    "counter": {
        "0": "Node 0",
        "1": "Node 1",
        "2": "Node 2"
    },
}

"0 > 'Node 0'"
"1 > 'Node 1'"
"2 > 'Node 2'"

"color.%"
"token:token.pos=%"

const actors = ["Node 0", "Node 1", "Node 2"]

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


const gridWrapperStyle = {
    position: "relative", // necessary for relative positioning of messages to this element
    display: "grid",
    gridTemplateColumns: `repeat(${actors.length}, 1fr)`,
    height: "min-content",
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

    if (Array.isArray(varTree) || typeof varTree !== "object") {
        return []
    }

    const dfs = (obj, accessors) => {
        if (Array.isArray(obj) || typeof obj !== "object") {
            keys.push([...accessors])
            return
        }

        for (const k of Object.keys(obj)) {
            accessors.push(k)
            dfs(obj[k], accessors)
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

    let keysActorPairs = [...keysActorPairsWrite, ...keysActorPairsRead, ...keysActorPairsReadDuringWrite]


    // TODO what should we do with unmapped vars?
    // TODO what if only unmapped vars? or one action not mapped?
    keysActorPairs = keysActorPairs.filter(p => p.actor !== undefined)

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
        border: "1px solid black",
        margin: "0 8px",
        width: "fit-content",
        height: "min-content",
        justifySelf: "center",
        alignSelf: "end",
    }

    return html`
    <div style=${actorStyle}>${label}</div>
    `
}

const delayActionStartPx = 24
const actionLineWidth = 3
/** an action is the point where the diagram's lifeline is activated */
const Action = ({ row, col, label, msgs }) => {
    const boxStyle = {
        ...gridElementStyle(col, row),
        width: `${actionLineWidth}%`,
        height: `calc(2em * ${msgs.length + 1})`,
        border: "1px solid black",
        backgroundColor: "white",
        marginLeft: "calc(50% - 1.5%)",
        marginTop: `${delayActionStartPx}px`,
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

    getLabelIdentifier() {
        return `${this.props.fromCol}-${this.props.toCol}-${this.props.row}-${this.props.label}`
    }

    calcLineData() {
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
        const yOffset = (heightFrom - delayActionStartPx) * this.props.yRelativePosition


        const line = {
            xFrom: xOffsetFrom + xOffsetCenter,
            yFrom: yOffsetFrom + yOffset + delayActionStartPx,
            xTo: xOffsetTo + xOffsetCenter,
            yTo: yOffsetTo + yOffset + delayActionStartPx,
            label: this.props.label,
            key: this.getLabelIdentifier(),
            type: this.props.type,
        }
        return line
    }

    componentDidMount() {
        const line = this.calcLineData()
        this.props.setLines(lines => [...lines, line])
    }

    componentWillUnmount() {
        this.props.setLines(lines => lines.filter(l => l.key !== this.getLabelIdentifier()))
    }

    /** yRelativePosition is the percentage [0,1] where the message starts and ends */
    render({ fromCol, toCol, row, label, yRelativePosition, setLines }) {
        return html`
            <div ref=${this.refFrom} style=${gridElementStyle(fromCol, row)}></div>
            <div ref=${this.refTo} style=${gridElementStyle(toCol, row)}></div>
            `
    }
}

const MessageArrows = ({ lines, numCols, numRows }) => {
    const svgStyle = {
        position: "absolute",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    }

    const lineStyle = {
        stroke: "black",
        strokeWidth: 1.5,
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
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
        </defs>
        <!-- add line and text in the middle of it -->
        ${lines.map(({ xFrom, yFrom, xTo, yTo, label, type }) => html`
        <g>
            <text style=${textStyle} x=${xFrom + (xTo - xFrom) / 2} y=${yFrom + (yTo - yFrom) / 2 - 8}>${label}</text>
            <line style=${lineStyle} x1=${xFrom} y1=${yFrom} x2=${xTo} y2=${yTo} />
        </g>
        `)}
    </svg>`
}

const ActionInspector = ({ actionVizData, startRow, close }) => {
    const gridElementStyle = {
        gridColumn: `1 / span ${actors.length}`,
        gridRow: `${startRow} / 40`, // doesn't actually span 40 rows, instead goes to the end of the grid
        zIndex: 3,
        display: "flex",
        pointerEvents: "none"
    }

    const [opacity, setOpacity] = useState(0)

    const containerStyle = {
        backgroundColor: "rgb(249 249 249)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        width: "100%",
        padding: "16px",
        height: "min-content",
        transition: "opacity 0.2s ease-out",
        opacity: opacity,
        pointerEvents: "auto",
        boxShadow: "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px"
    }

    useEffect(() => {
        setOpacity(1)
        return () => setOpacity(0)
    }, [])

    const delayedClose = () => {
        setOpacity(0)
        setTimeout(close, 100)
    }

    return html`
    <div style=${gridElementStyle}>
        <div style=${containerStyle}>
            <style>
                .close {
                    transition: background-color 0.1s ease-in-out;
                    background-color: rgba(212, 212, 212, 0);
                    height: min-content;
                    width: min-content;
                    padding: 0 0.3em;
                    border-radius: 50%;
                    cursor: pointer;
                }
                
                .close:hover {
                    background-color: rgba(212, 212, 212, 1);
                }
            </style>
            <div style=${{ display: "flex", justifyContent: "space-between", flexDirection: "row", alignItems: "flex-start", padding: "0 0 8px 0" }}>
                <h4 style=${{ margin: "0" }}>${actionVizData.label}</h4>
                <div class="close" onClick=${delayedClose}>${"\u{2715}"}</div>
            </div>
            <button>Reset to this action</button>
        </div>
    </div>
    `
}

const MessagesPositionsCompution = ({ vizData, lines, setLines }) => {

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
            return { fromCol, toCol, row, label: m.label, yRelativePosition, type: m.type }
        })

        const writeMsgPositions = writeMsgs.map((m, j) => {
            const fromCol = a2c.get(actor)
            const toCol = a2c.get(m.to)
            // writes start at the end up to the middle
            const yRelativePosition = 1.0 - j / writeMsgs.length / 2
            return { fromCol, toCol, row, label: m.label, yRelativePosition, type: m.type }
        })

        const msgsWithoutSelfReferences = [...readMsgPositions, ...writeMsgPositions].filter(m => m.fromCol !== m.toCol)

        return msgsWithoutSelfReferences
    }

    return vizData
        .flatMap(computeMessagePositions)
        .map((p) => html`<${LinePositioning} ...${p} lines=${lines} setLines=${setLines} />`)
}

const EdgePickerButton = (props) => {
    useEffect(() => {
        // onMouseLeave is not called if the button gets removed while the mouse is still on it
        // so we need to manually call it
        return () => {
            if (props.onMouseLeave) props.onMouseLeave()
        }
    }, [])

    return html`
    <button class="edgepicker" ...${props} />`
}

const Diagram = ({ graph, prevEdges, setPrevEdges, previewEdge, currNode, setCurrNode, setPreviewEdge }) => {
    const [lines, setLines] = useState([])

    const edges = previewEdge ? [...prevEdges, previewEdge] : prevEdges
    const vizData = edges.map(e => edgeToVizData(e, varToActor))

    const [inspectEdge, setInspectEdge] = useState(null)

    const toggle = (i) => {
        setInspectEdge(v => {
            if (v === i) {
                return null
            }
            return i
        })
    }

    return html`
        <div style=${{ display: "flex", flexDirection: "column", flex: "1 0 0" }}>
            <style>
                .field {
                }

                .field:hover {
                    transition: background-color 0.3s ease-in-out;
                    background-color: rgb(240,240,241, 0.5);
                    cursor: pointer;
                }
            </style>
            <div style=${{ padding: "16px 32px 16px 16px", display: "flex", flex: "1 0 0", overflowY: "scroll" }}>
                <div style=${{ ...gridWrapperStyle, width: "100%" }}>
                    ${actors.map(a => html`<${Actor} label=${a} col=${a2c.get(a)} row=${1} />`)}
                    ${actors.map(a => html`<${Lifeline} numRows=${vizData.length + 1} column=${a2c.get(a)} />`)}
                    ${vizData.map((d, i) => html`<${Action} row=${i + 2} col=${a2c.get(d.actor)} ...${d}/>`)}
                    <${MessagesPositionsCompution} vizData=${vizData} lines=${lines} setLines=${setLines} />
                    <${MessageArrows} lines=${lines} numCols=${actors.length} numRows=${vizData.length + 1} />
                    <!-- last row with fixed height to still show some of the lifeline -->
                    ${actors.map((_, i) => html`<div style=${{ ...gridElementStyle(i + 1, vizData.length + 2), height: "32px" }}></div>`)}
                    ${vizData.map((_, i) => html`<div style=${{ gridColumn: `1 / span ${actors.length}`, gridRow: `${i + 2}`, zIndex: 3 }} class="field" onClick=${() => toggle(i)}></div>`)}
                    ${inspectEdge !== null ? html`<${ActionInspector} actionVizData=${vizData[inspectEdge]} startRow=${inspectEdge + 3} close=${() => setInspectEdge(null)} />` : ""}
                </div>
            </div>
        </div>
        `
}

const Topbar = ({ graph, prevEdges, currNode, setPreviewEdge, setCurrNode, setPrevEdges }) => {
    const tableHeaderStyle = {
        textAlign: "left",
        fontWeight: "normal"
    }

    const diagramContainerStyle = {
        padding: "16px 32px 16px 16px",
        boxShadow: "rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px"
    }

    const nextEdges = Object.entries(graph.outgoingEdges.get(currNode.id))

    const selectNodeFn = ([to, e]) => {
        return () => {
            setCurrNode(graph.nodes.get(to))
            setPrevEdges([...prevEdges, e])
        }
    }

    const nextActionsPerActorIndex = actors.map(a => nextEdges.filter(([_, e]) => edgeToVizData(e, varToActor).actor === a))
    // TODO how to handle actions without actor?
    const nextActionsWithoutActor = nextEdges.filter(([_, e]) => edgeToVizData(e, varToActor).actor === undefined)

    if (nextActionsWithoutActor.length > 0) {
        console.warn("next action without actor", nextActionsWithoutActor)
    }

    if (nextActionsPerActorIndex.flat().length !== nextEdges.length) {
        console.warn("next action without actor", nextActionsWithoutActor)
    }

    const keySeqs = nestedKeys(currNode.vars)
    const keySeqsActorPairsPerActor = actors.reduce((acc, a) =>
        acc.set(a, keySeqs.filter(keys => apply(varToActor, keys) === a)), new Map())


    const exportToHTML = (keys) => {
        const value = apply(currNode.vars, keys)

        if (Array.isArray(value) && value.length > 0) {
            return value.map(
                (v, i) => html`
                            <tr>
                                ${i === 0
                        ? html`<td style=${{ rowspan: value.length }}>${keys.join(".")}</td>`
                        : html`<td></td>`}
                                <td>${JSON.stringify(v)}</td>
                            </tr>
                        `)
        }

        return html`
                <tr>
                    <td>${keys.join(".")}</td>
                    <td>${JSON.stringify(value)}</td>
                </tr>`
    }

    const mergeTrees = (acc, n) => {
        const varsTree = n.vars

        const dfs = (accChild, child) => {
            if (Array.isArray(child) || typeof child !== "object") {
                return
            }

            for (const k of Object.keys(child)) {
                if (accChild[k] === undefined) {
                    accChild[k] = {}
                }
                dfs(accChild[k], child[k])
            }
        }

        dfs(acc, varsTree)

        return acc
    }

    //const allVarScopes = graph.nodesList.reduce(mergeTrees, {})

    return html`
    <div style=${diagramContainerStyle}>
        <div style=${{ ...gridWrapperStyle, gridGap: "16px" }}>
                    ${actors.map((a, i) => html`
                        <div style=${{ display: "flex", flexDirection: "column", gridColumn: i + 1, gridRow: 1, }}>
                            <h4>${a}</h4>
                            <table>
                                <thead>
                                    <tr>
                                        <th style=${tableHeaderStyle}>Scope</th>
                                        <th style=${tableHeaderStyle}>Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${keySeqsActorPairsPerActor.get(a).map(exportToHTML)}
                                </tbody>
                            </table>
                        </div>`)}
        </div>
        <h4>Choose Next Action</h4>
        <div style=${gridWrapperStyle}>
            ${nextActionsPerActorIndex.map((actions, i) => html`
                <div style=${{ gridColumn: i + 1, gridRow: 1, display: "flex", flexDirection: "column" }}>
                    ${actions.map(([to, e]) => html`
                        <${EdgePickerButton} 
                            onClick=${selectNodeFn([to, e])}
                            onMouseEnter=${() => setPreviewEdge(e)}
                            onMouseLeave=${() => setPreviewEdge(null)}
                            >
                            ${e.label + e.parameters}
                        </${EdgePickerButton}>`)}
                </div>
            `)}
        </div>
    </div>
    `
}

const State = ({ graph, initNode }) => {
    const [currNode, setCurrNode] = useState(initNode)
    const [previewEdge, setPreviewEdge] = useState(null)
    const [prevEdges, setPrevEdges] = useState([])

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flex: "1 0 0",
    }

    const props = { graph, prevEdges, setPrevEdges, previewEdge, setPreviewEdge, currNode, setCurrNode }

    return html`
    <div style=${containerStyle}>
        <${Topbar} ...${props}  />
        <${Diagram} ...${props} />
    </div>
    `
}

const GraphProvider = () => {
    // only do computation-heavy operations on whole graph once
    const nodesList = ewd998Small.graph.filter(n => n.$type === "node" || n.$type === "init-node")
    const nodes = nodesList.reduce((acc, n) => acc.set(n.id, n), new Map())
    const edges = ewd998Small.graph.filter(e => e.$type === "edge")
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

    const graph = { nodes, edges, outgoingEdges, nodesList }

    return html`<${State} graph=${graph} initNode=${initNode}/>`
}

export const SequenceDiagram = () => {

    return [
        html`
        <style>
            .edgepicker {
                background: white;
                border: 1px solid black;
                box-sizing: border-box;
                padding: 8px;
                margin: 0 4px 4px 4px;
                text-align: center;
                cursor: pointer;
                touch-action: manipulation;
            }

            .edgepicker:hover {
                background-color: rgb(240,240,241);
            }
        </style>
        `,
        html`<${GraphProvider} />`
    ]
}