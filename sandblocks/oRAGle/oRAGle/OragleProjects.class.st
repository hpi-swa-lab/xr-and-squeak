"
OragleProjects' instance methods are ""workspaces"" that contain user code for different projects.
"
Class {
	#name : #OragleProjects,
	#superclass : #Object,
	#classVars : [
		'Objects',
		'ObjectsInversed',
		'Projects',
		'Server'
	],
	#category : #oRAGle,
	#'squeak_changestamp' : 'tobe 1/19/2024 07:27'
}

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 2/3/2024 18:26'
}
OragleProjects class >> cleanUp: aggressive [

	aggressive ifTrue:
		[self cleanUpObjects.
		self cleanUpProjects].
]

{
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 18:15'
}
OragleProjects class >> cleanUpObjects [

	Objects removeAll.
	ObjectsInversed removeAll.
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 2/3/2024 18:26'
}
OragleProjects class >> cleanUpProjects [

	Projects := nil.
]

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'ct 1/25/2024 12:22'
}
OragleProjects class >> initialize [

	Objects := Dictionary new.
	ObjectsInversed := IdentityDictionary new.
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 13:13'
}
OragleProjects class >> makeIdFor: anObject [

	^ ObjectsInversed at: anObject ifAbsentPut:
		[| id |
		id := UUID new asString.
		Objects at: id put: anObject.
		id].
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 12:35'
}
OragleProjects class >> objectForId: id [

	^ Objects at: id
]

{
	#category : #projects,
	#'squeak_changestamp' : 'ct 2/2/2024 18:05'
}
OragleProjects class >> projects [

	^ Projects ifNil: [Projects := Dictionary new]
]

{
	#category : #projects,
	#'squeak_changestamp' : 'ct 2/3/2024 18:23'
}
OragleProjects class >> promptsForProjectId: projectId [

	^ (self projects at: projectId) promptsWithOutputs
]

{
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 19:32'
}
OragleProjects class >> queryExamples [

OragleProjects
	resolveQuery:
		{'extent0' -> 'extent'. "key is for outer structure, value is message send"
		'self extent..' -> #('area'). "key is for outer structure and context of nested query, nested query has values in context"
		'extentFOO' -> {'extent' -> 'className'} asDictionary.
		'extentBAR' -> {'extent' -> {'x'. 'y'. 'className'}} asDictionary.
		'self extent' -> {'x'. 'y'. 'className'. {'z' -> 'area'} asDictionary}.
		'self extent...' -> {'z' -> {'z' -> 'className'} asDictionary} asDictionary.
		'self extent....' -> {{'z' -> {'z' -> 'className'} asDictionary} asDictionary}.
		'self extent.' -> 'self className'.
		'rectangle' -> 'extent'.
		'self extent.....' -> nil.
		}
	for: World.

OragleProjects
	resolveQuery: 'self first'
	for: {OrderedCollection with: 'hello'}.
	
OragleProjects
	resolveQuery:
		{'extent2' -> 
			({'owner' -> 'owner'.
			'submorphCount' -> 'self submorphs size'} as: Dictionary)
		}
	for: World.
	
OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {{'1' -> 'self at: 1'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> '[]'
		"'submorphs' -> {'submorphs'. '[]'}"}
	for: World.	

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {{{'self first: 3' -> #('size')} asDictionary}}} "TODO: double nested array should exclude some key from result structure"
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {{'self first: 3' -> '[]'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> 
			{{'[]' -> 'self className'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs first' -> {'x' -> {'self'}} asDictionary}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {
			{'[]' -> 'self'.
			'size' -> 'size'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {
			{'[]' -> {'self'. 'className'}.
			'size' -> 'size'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {
			{'[]' ->
				{'self' -> nil.
				'className' -> 'className'.
				'position' ->
					{'x'. 'y'}}.
			'size' -> 'size'} asDictionary}}
	for: World.

OragleProjects
	resolveQuery: 'self first'
	for: {World}
]

{
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 18:15'
}
OragleProjects class >> queryTodos [

	"
	- dynamic dictionaries ('{}')?
	- provide _jsTransform for parsing
		example:
			const imageFromBase64 = (base64) => {var image = new Image(); image.src = 'data:image/png;base64,' + base64; return image};
			await sqQuery('Morph new', {image: {'': '(ByteArray streamContents: [:stream | PNGReadWriter putForm: self imageForm onStream: stream]) base64Encoded', _jsTransform: imageFromBase64}})
	- garbabe collection for objects!
	"
]

{
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 18:33'
}
OragleProjects class >> resolveQuery: query for: anObject [

	| results |
	query ifNil:
		[^ (self
			resolveQuery: (anObject oragleDefaultQuery: true)
			for: anObject)
				removeKey: #_sqOriginalQuery;
				yourself].
	query isString ifTrue:
		[results := self resolveQuery: {query} for: anObject.
		^ query = '[]'
			ifTrue: [results]
			ifFalse: [results at: query]].
	query isArray ifTrue:
		[^ self
			resolveQuery:
				(query
					collect: [:ea |
						(ea isKindOf: Association)
							ifTrue: ["syntax sugar for direct smalltalk invocation" ea]
							ifFalse: [ea -> ea]]
					as: Dictionary)
			for: anObject].
	
	results := JsonObject new.
	results _sqOriginalQuery: query.
	query keysAndValuesDo: [:key :value |
		| expression nestedQuery result |
		true caseOf:
			{[value isNil] ->
				[expression := nil.
				nestedQuery := nil].
			[value isBlock] ->
				[expression := value.
				nestedQuery := nil].
			[value = '[]'] ->
				[expression := key == value ifFalse: [key].
				nestedQuery := key == value ifFalse: [{value -> nil}]].
			[value isString] ->
				[expression := value.
				nestedQuery := nil].
			[value isDictionary] ->
				[expression := nil.
				nestedQuery := value].
			[true] ->
				[expression := key = '[]' ifFalse: [key].
				nestedQuery := value.
				self assert: nestedQuery notNil]}.
		result := expression
			ifNil: [anObject]
			ifNotNil:
				[true caseOf:
					{[expression isBlock] -> [expression value].
					[true] ->
						[(expression ~= 'self' and: [(Scanner isMessageSelector: expression)])
							ifTrue: [expression := 'self ' , expression].
						key = '[]'
							ifTrue: [anObject collect: [:ea | Compiler evaluate: expression for: ea]]
							ifFalse: [Compiler evaluate: expression for: anObject]]}].
		nestedQuery ifNotNil:
			[result := key = '[]'
				ifTrue: [result collect: [:ea | self resolveQuery: nestedQuery for: ea]]
				ifFalse: [self resolveQuery: nestedQuery for: result]].
		
		true
			caseOf:
				{[key = '[]'] ->
					[result withIndexDo: [:ea :index |
						results at: index asString put: (self serialize: ea)]].
				[key = ''] ->
					[self assert: query size = 1.
					^ self serialize: result].
				[key isDictionary] ->
					[result keysAndValuesDo: [:eachKey :eachValue |
						results at: eachKey put: eachValue]]}
			otherwise:
				[results at: key put: (self serialize: result)]].
	results _sqId: (self makeIdFor: anObject).
	^ results
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 16:19'
}
OragleProjects class >> serialize: anObject [

	^ self serialize: anObject ifNotPrimitiveObject:
		[(self resolveQuery: anObject oragleDefaultQuery for: anObject)
			removeKey: #_sqOriginalQuery;
			yourself]
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 16:19'
}
OragleProjects class >> serialize: anObject ifNotPrimitiveObject: aBlock [

	(anObject isNil or: [anObject isString] or: [anObject isNumber] or: [anObject isBoolean])
		ifTrue: [^ anObject].
	anObject isCharacter
		ifTrue: [^ anObject asString].
	(anObject respondsTo: #_sqId)
		ifTrue: [^ anObject].
	
	^ aBlock value
]

{
	#category : #rpc,
	#'squeak_changestamp' : 'ct 2/2/2024 12:48'
}
OragleProjects class >> startRpc [

	Server := WebServer new
		listenOn: 9823;
		addService: '/sbEval' action: [:req |
			Transcript showln: req content.
			req
				send200Response: (Compiler evaluate: req content)
				contentType: 'text/plain'
				do: [:res | res headerAt: 'Access-Control-Allow-Origin' put: '*']];
		errorHandler: [:err :request | ToolSet debugException: err];
		yourself
]

{
	#category : #rpc,
	#'squeak_changestamp' : 'tobe 1/19/2024 07:29'
}
OragleProjects class >> stopRpc [

	Server ifNotNil: #destroy
]

{
	#category : #projects,
	#'squeak_changestamp' : 'ct 2/3/2024 18:22'
}
OragleProjects class >> updateProjectNamed: selector approvedPrice: totalCents [

	| newProject |
	newProject := self new perform: selector.
	newProject approvedPrice: totalCents.
	self projects
		at: newProject uuid
		ifPresent: [:oldProject | oldProject adoptFrom: newProject]
		ifAbsentPut: [newProject].
]

{
	#category : #projects,
	#'squeak_changestamp' : 'ct 1/22/2024 12:43'
}
OragleProjects >> copilot [
<sandblocksExtensions: #(oragle:base)>

| codeSample longPrompt module sample input inputs prefix |
longPrompt := 'You are an expert programmer, assisting in completing code snippets. You do not add comments, only complete statements. If the given prefix to be completed is the start of a function, you may complete the entire function but only do so, if you can complete it without elision. Answer only the code that is to be inserted.'.

codeSample := Text codeSample.

module := OragleSequenceModule new
	separator: String cr , String cr;
	children:
		{OragleScriptModule new children:
				{OragleSequenceModule new children:
						{OragleAlternation new children: {
								OragleLeafModule new
									label: 'postcard';
									content: '''\\Example>>'' withCRs, codeSample';
									state: #enabled.
								OragleLeafModule new
									label: 'handcrafted';
									content: 'randomMethod source';
									state: #enabled} "#enabled, #mute, #solo"
							}}.
		OragleSequenceModule new
			label: 'completion prefix';
			state: #enabled;
			separator: String cr , String cr;
			children:
				{OragleAlternation new
					children:
						{OragleLeafModule new
							content:
'toIsometric: aPoint

	"Return a new point in isometric view"
	^ '};
						state: #enabled}.
		OragleSequenceModule new
			label: 'languageKnowledge';
			state: #enabled;
			separator: String cr , String cr;
			children:
				{OragleAlternation new
					children: {
						OragleLeafModule new
							content: '';
							label: 'noKnowledge';
							state: #enabled.
						OragleSequenceModule new
							label: 'someKnowledge';
							children:
								{OragleLeafModule new
									content: 'This is a sample of Smalltalk code:';
									state: #enabled.
								OragleLeafModule new
									content: sample;
									state: #enabled}
					}}.
		OragleSequenceModule new
			label: 'context';
			state: #enabled;
			separator: String cr, String cr;
			children:
				{
					OragleLeafModule new
						label: 'context';
						content: 

'"Smalltalk methods from the code base that are helpful: "

	Point >> x
		"Answer the x coordinate."

		^x

	Point >> y
		"Answer the y coordinate."

		^y

	Point>>area
		^ x * y

	Point>>normalized
		"Optimized for speed -- ar 8/26/2001"
		| r |
		r := ((x*x) + (y * y)) sqrt.
		^(x / r) @ (y / r)'.
				}.
		}; label: 'copilot'.

inputs := ((input reject: [:obj | obj includesKey: 'disable']) collect: [:obj |

	(obj at: #name) -> {
		prefix.
		{#withSamples -> {
			obj at: #languageKnowledge.
			{'The following snippets from the {1} code base may help:' format: {obj at: #language}}.
			obj at: #context}.
		 #withoutSamples -> {}}.
		{'This code is to be completed:'}.
		{obj at: #complete}
	}

]) theThing theThing theThing theThing collect: [:pair | pair key -> ((pair value gather: #yourself) joinSeparatedBy: String cr, String cr)].

(inputs concurrentCollect: [:prompt |
	prompt key -> {(SemanticConversation new
		addUserMessage: prompt value;
		getAssistantReply). prompt}]) as: Dictionary

]

{
	#category : #projects,
	#'squeak_changestamp' : 'ct 2/3/2024 18:38'
}
OragleProjects >> copilotWithoutScripts [
	| codeSample postcard handcrafted longPrompt |
	<sandblocksExtensions: #(oragle:base)>
	longPrompt := 'You are an expert programmer, assisting in completing code snippets. You do not add comments, only complete statements. If the given prefix to be completed is the start of a function, you may complete the entire function but only do so, if you can complete it without elision. Answer only the code that is to be inserted!'.
	codeSample := Text codeSample.
	postcard := '''\\Example>>'' withCRs , codeSample'.
	handcrafted := (Collection >> #do:) getSource.
	^ OragleProject new uuid: 'c6784713-05f4-394d-aa8d-d191ed371a95';
		 label: 'Copilot (without scripts)';
		 rootModule: (OragleSequenceModule new uuid: 'a1982e9b-06de-584b-8dbc-7acabb74117c';
			 separator: String cr , String cr;
			 children: {OragleSequenceModule new uuid: 'be3d13b7-51b9-0648-a6aa-10573205d3bb';
				 label: 'completion prefix';
				 state: #enabled;
				 separator: String cr , String cr;
				 children: {OragleAlternation new uuid: 'ac0fa7f1-28d2-c241-88f8-752e29eac33d';
					 children: {OragleLeafModule new uuid: '6ce1488e-1279-2240-ad7e-dac4a3d4170d';
						 content: 'toIsometric2: aPoint

			"Return a new point in isometric view"
			^ '; state: #solo. OragleLeafModule new uuid: '3b5c15dc-225d-47de-893e-a1af1899eaa3';
						 content: 'toIso3'; state: #solo};
					 state: #enabled}. OragleSequenceModule new uuid: '5002757e-9e13-4242-b317-41d474c39e17';
				 label: 'languageKnowledge';
				 state: #enabled;
				 separator: String cr , String cr;
				 children: {OragleAlternation new uuid: '03e6065a-5a66-6544-9844-772f516dfbc6';
					 children: {OragleLeafModule new uuid: 'ef751794-b91e-f345-9b45-7d9e5232f7b1';
						 content: '';
						 label: 'noKnowledge';
						 state: #enabled. OragleSequenceModule new uuid: '2e988215-5483-124b-b2a0-dc2b1cac98aa';
						 label: 'someKnowledge';
						 children: {OragleLeafModule new uuid: '8b06a43d-e88a-d040-97a7-cc10bba9ab67';
							 content: 'This is a of Smalltalk code:';
							 state: #enabled. OragleAlternation new children: {OragleLeafModule new uuid: '0a7ef53a-58ef-4e4a-a555-bf66b8a70e18';
								 content: postcard;
								 state: #enabled. OragleLeafModule new content: handcrafted}}}}. OragleSequenceModule new uuid: '2162a794-9759-f448-9eb6-dc857688d6fd';
				 label: 'context';
				 state: #enabled;
				 separator: String cr , String cr;
				 children: {OragleLeafModule new uuid: '3ab8b143-1b76-4945-beb6-c499288dfc46';
					 label: 'context';
					 content: '"Smalltalk methods from the code base that are helpful: "

			Point >> x
				"Answer the x coordinate."

				^x

			Point >> y
				"Answer the y coordinate."

				^y

			Point>>area
				^ x * y

			Point>>normalized
				"Optimized for speed -- ar 8/26/2001"
				| r |
				r := ((x*x) + (y * y)) sqrt.
				^(x / r) @ (y / r)'}})

]
