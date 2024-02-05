import { h } from "../../view/widgets.js";
import { useCallback, useEffect, useRef, useState, useContext } from "../../external/preact-hooks.mjs";
import htm from '../../external/htm.mjs';
import { Component, createContext, createRef } from "../../external/preact.mjs";
const html = htm.bind(h);

/** actor to column map */
const DiagramConfig = createContext()

/** succesively applies the list of keys to obj. If the any intermediate result is a string, it is returned.
 * @example
 * apply({"a": {"b": "result"}}, ["a", "b"]) // "result"
 * 
 * @example
 * apply({"a": {"b": "result"}}, ["a", "b", "c"]) // "result"
 * 
 * @param {any} obj 
 * @param {string[]} keys 
 * @returns any
 */
function apply(obj, keys) {
    const reversedKeys = [...keys].reverse()
    let result = obj
    while (reversedKeys.length > 0) {
        const k = reversedKeys.pop()
        if (Array.isArray(result)) {
            // this happens if the nested data structur is either a set or a sequence
            // if k is a number, we can access the element at that index
            // Note: In TLA+, arrays are 1-indexed
            result = result[k - 1]

            // we can also think of cases like {1, 2, 3}, where result would
            // also be modeled as an array and the key might be an int
            // TODO what do to then? -> currently we don't apply keys
            // on sets, so this shouldn't happen.
        } else {
            result = result[k]
        }

        if (result === undefined) {
            return undefined
        }

        if (typeof result === "string") {
            return result
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
function edgeToVizData({ reads, readsDuringWrites, writes, label }, currNode, nextNode) {
    const { varToActor, messageActors } = useContext(DiagramConfig)

    const writeKeys = nestedKeys(writes)
    const readKeys = nestedKeys(reads)
    const readsDuringWritesKeys = nestedKeys(readsDuringWrites)

    const getKeysAndActor = (keys, valueFallback) => {
        let applied = apply(varToActor, keys)

        if (applied instanceof Object) {
            // we need to check the actual values of the variables
            const val = apply(valueFallback, keys)
            if (!(val instanceof Object)) {
                applied = apply(varToActor, [...keys, `${val}`])
            }
        }

        if (typeof applied !== "string") {
            applied = undefined
        }

        return { keys, actor: applied }
    }

    const keysActorPairsWrite = writeKeys.map(k => getKeysAndActor(k, nextNode.vars))
    const keysActorPairsRead = readKeys.map(k => getKeysAndActor(k, currNode.vars))
    const keysActorPairsReadDuringWrite = readsDuringWritesKeys.map(k => getKeysAndActor(k, currNode.vars))

    let keysActorPairs = [...keysActorPairsWrite, ...keysActorPairsRead, ...keysActorPairsReadDuringWrite]


    // TODO what should we do with unmapped vars?
    // TODO what if only unmapped vars? or one action not mapped?
    keysActorPairs = keysActorPairs.filter(p => p.actor !== undefined)

    const freqs = {}
    keysActorPairs.forEach(({ actor }) => freqs[actor] ? freqs[actor] += 1 : freqs[actor] = 1)

    let actor = null
    let max = 0
    for (const [k, v] of Object.entries(freqs)) {
        if (messageActors?.includes(k)) {
            // skip actors that solely abstract message passing
            continue
        }
        if (v > max) {
            actor = k
            max = v
        }
    }

    const keysActorPairsToMsg = (p) => {
        const type = keysActorPairsWrite.includes(p) ? "write" : "read"
        const object = p.keys.reduce((acc, k) => acc + "[" + k + "]")
        return { to: p.actor, type: type, label: `${type} ${object}` }
    }

    const msgs = keysActorPairs
        .filter(pair => pair.actor !== actor) // remove self references
        .map(keysActorPairsToMsg)
        .filter(({ to, type }, i, msgs) => !msgs.slice(0, i).find(m => m.type === type && m.to === to)) // only keep first message of each type to each actor

    return { label, actor, msgs }
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
        fontWeight: "bold"
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
    const { actors } = useContext(DiagramConfig)

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
    const { a2c } = useContext(DiagramConfig)

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

const Diagram = ({ graph, prevEdges, setPrevEdges, previewEdge, currNode, setCurrNode, setPreviewEdge, vizData }) => {
    const { a2c, actors } = useContext(DiagramConfig)

    const [lines, setLines] = useState([])

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
                <div class="gridWrapper" style=${{ width: "100%" }}>
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

const Topbar = ({ graph, prevEdges, currNode, setPreviewEdge, setCurrNode, setPrevEdges, vizData }) => {
    const { actors, varToActor } = useContext(DiagramConfig)

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

    const nextActionsPerActorIndex = actors.map(a => nextEdges.filter(([_, e]) => edgeToVizData(e, currNode, graph.nodes.get(e.to)).actor === a))

    const keysMappingToActors = nestedKeys(varToActor)
    // TODO what about keys not mapping to actors
    const keysPerActorIndex = actors.map(a => {
        const keysOfThisActor = keysMappingToActors.filter(keys => apply(varToActor, keys) === a)
        return keysOfThisActor
    })

    const exportToHTML = (keys) => {
        const value = apply(currNode.vars, keys)

        const scope = keys.reduce((acc, k) => acc + "[" + k + "]")

        if (Array.isArray(value) && value.length > 0) {
            return value.map(
                (v, i) => html`
                            <tr>
                                ${i === 0
                        ? html`<td style=${{ rowspan: value.length }}>${scope}</td>`
                        : html`<td></td>`}
                                <td>${JSON.stringify(v)}</td>
                            </tr>
                        `)
        }

        return html`
                <tr>
                    <td>${scope}</td>
                    <td>${JSON.stringify(value)}</td>
                </tr>`
    }

    return html`
    <div style=${diagramContainerStyle}>
        <div class="gridWrapper" style=${{ gridGap: "16px" }}>
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
                                    ${keysPerActorIndex[i].map(exportToHTML)}
                                </tbody>
                            </table>
                        </div>`)}
        </div>
        <h4>Choose Next Action</h4>
        <div class="gridWrapper">
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

const State = ({ graph, initNodes }) => {
    const [currNode, setCurrNode] = useState(graph.nodes.get(initNodes[0].id))
    const [previewEdge, setPreviewEdge] = useState(null)
    const [prevEdges, setPrevEdges] = useState([])

    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flex: "1 0 0",
    }


    const edges = previewEdge ? [...prevEdges, previewEdge] : prevEdges

    const prevNodes = edges.map(e => graph.nodes.get(e.from))
    const nextNodes = edges.map(e => graph.nodes.get(e.to))
    const vizData = edges.map((e, i) => edgeToVizData(e, prevNodes[i], nextNodes[i]))

    const props = { graph, prevEdges, setPrevEdges, previewEdge, setPreviewEdge, currNode, setCurrNode, vizData }

    const InitStateSelection = () => {
        const resetInitNode = (nodeId) => {
            setCurrNode(graph.nodes.get(nodeId))
            setPrevEdges([])
        }

        return [
            html`<label for="init">Choose initial state:</label>`,
            html`<select id="init" value=${currNode.id} onChange=${e => resetInitNode(e.target.value)}>
                    ${initNodes.map(n => html`<option value=${n.id}>${n.id}</option>`)}
                </select>`
        ]
    }

    return html`
    <div style=${containerStyle}>
        <${InitStateSelection} />
        <${Topbar} ...${props}  />
        <${Diagram} ...${props} />
    </div>
    `
}

const GraphProvider = ({ spec }) => {
    // only do computation-heavy operations on whole graph once
    const nodesList = spec.graph.filter(n => n.$type === "node" || n.$type === "init-node")
    const nodes = nodesList.reduce((acc, n) => acc.set(n.id, n), new Map())
    const edges = spec.graph.filter(e => e.$type === "edge")
    const initNodes = nodesList.filter(n => n.$type === "init-node")

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

    const allVarScopes = graph.nodesList.reduce(mergeTrees, {})
    console.log(allVarScopes)

    const config = {
        actors: spec.transformation.actors,
        varToActor: spec.transformation.varSpaceToActor,
        messageActors: spec.transformation.messageActors,
        a2c: spec.transformation.actors.reduce((acc, a, i) => acc.set(a, i + 1), new Map())
    }

    return [
        html`
        <style>
            .gridWrapper {
                position: relative;
                display: grid;
                grid-template-columns: ${`repeat(${config.actors.length}, 1fr)`};
                height: min-content;
            }
        </style>
        `,
        html`
    <${DiagramConfig.Provider} value=${config}>
        <${State} graph=${graph} initNodes=${initNodes}/>
    </${DiagramConfig.Provider}>`
    ]
}

export const SpecPicker = () => {
    const [spec, setSpec] = useState()

    const loadSpec = (e) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const result = JSON.parse(e.target.result)
            setSpec(result)
        }
        reader.readAsText(e.target.files[0])
    }

    return html`
    <div style=${{ display: "flex" }}>
        <label for="spec">Load spec</label>
        <!-- we reset the spec state onClick to prevent inconsistent state while loading the new (potentially large) spec -->
        <input type="file" id="spec" accept=".json" onClick=${() => setSpec(undefined)} onChange=${loadSpec} />
    </div>
    ${spec ? html`<${GraphProvider} spec=${spec} />` : ""}
    `
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
        html`<${SpecPicker} />`
    ]
}