"
OragleProjects' instance methods are ""workspaces"" that contain user code for different projects.
"
Class {
	#name : #OragleProjects,
	#superclass : #Object,
	#classVars : [
		'Objects',
		'ObjectsInversed',
		'Server'
	],
	#category : #oRAGle,
	#'squeak_changestamp' : 'tobe 1/19/2024 07:27'
}

{
	#category : #'class initialization',
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
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 14:53'
}
OragleProjects class >> queryExamples [

OragleProjects
	resolveQuery:
		{'extent0' -> 'extent'.
		'extent' -> {'extent'. {'x'. 'y'}}.
		'extent2' -> {'extent'.
			{'x' -> 'x'.
			'y' -> 'self y'.
			'area' -> 'self area'}}
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
		'submorphs' -> {'submorphs'. {'1' -> 'self at: 1'}}}
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
		'submorphs' -> {'submorphs first: 3'. '[]'}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {'submorphs'.
			{'[]' -> {nil. {'self className'}}}}}
	for: World.

OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs first' -> {'submorphs first'.
			{'x' -> {nil. {'self className'}}}}}
	for: World.


OragleProjects
	resolveQuery:
		{'owner' -> 'owner'.
		'submorphs' -> {'submorphs'.
			{'[]' -> 'self'.
			'size' -> 'size'}}}
	for: World.
	

OragleProjects
	resolveQuery: 'self first'
	for: {World}
]

{
	#category : #queries,
	#'squeak_changestamp' : 'ct 1/25/2024 14:51'
}
OragleProjects class >> resolveQuery: query for: anObject [

	| results |
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
	results _sqQuery: query.
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
				[expression := value first.
				nestedQuery := value second.
				self assert: nestedQuery notNil]}.
		result := expression
			ifNil: [anObject]
			ifNotNil:
				[true caseOf:
					{[expression isBlock] -> [expression value].
					[true] ->
						[(expression ~= 'self' and: [(Scanner isMessageSelector: expression)])
							ifTrue: [expression := 'self ' , expression].
						Compiler evaluate: expression for: anObject]}].
		nestedQuery ifNotNil:
			[result := key = '[]'
				ifTrue: [result collect: [:ea | self resolveQuery: nestedQuery for: ea]]
				ifFalse: [self resolveQuery: nestedQuery for: result]].
		
		key = '[]'
			ifTrue:
				[result withIndexDo: [:ea :index |
					results at: index asString put: (self serialize: ea)]]
			ifFalse:
				[results at: key put: (self serialize: result)]].
	results _sqId: (self makeIdFor: anObject).
	^ results
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 14:05'
}
OragleProjects class >> serialize: anObject [

	^ self serialize: anObject ifNotPrimitiveObject:
		[self resolveQuery: anObject oragleDefaultQuery for: anObject]
]

{
	#category : #'queries-private',
	#'squeak_changestamp' : 'ct 1/25/2024 14:05'
}
OragleProjects class >> serialize: anObject ifNotPrimitiveObject: aBlock [

	(anObject isNil or: [anObject isString] or: [anObject isNumber] or: [anObject isBoolean])
		ifTrue: [^ anObject].
	anObject isCharacter
		ifTrue: [^ anObject asString].
	(anObject respondsTo: #_sqQuery)
		ifTrue: [^ anObject].
	
	^ aBlock value
]

{
	#category : #rpc,
	#'squeak_changestamp' : 'ct 1/25/2024 14:53'
}
OragleProjects class >> startRpc [

	Server := WebServer new
		listenOn: 9824;
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
	#category : #'as yet unclassified',
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
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'ct 1/25/2024 10:52'
}
OragleProjects >> copilotWithoutScripts [
<sandblocksExtensions: #(oragle:base)>

| codeSample postcard handcrafted longPrompt |
longPrompt := 'You are an expert programmer, assisting in completing code snippets. You do not add comments, only complete statements. If the given prefix to be completed is the start of a function, you may complete the entire function but only do so, if you can complete it without elision. Answer only the code that is to be inserted.'.

codeSample := Text codeSample.
postcard := '''\\Example>>'' withCRs, codeSamle'.
handcrafted := (Collection >> #do:) getSource.

^ OragleProject new
	root:
		(OragleSequenceModule new
			separator: String cr , String cr;
			children:
				{OragleSequenceModule new
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
											content: 'This is a of Smalltalk code:';
											state: #enabled.
										OragleAlternation new children: {OragleLeafModule new
											content: postcard;
											state: #enabled.OragleLeafModule new content: handcrafted}}
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
				}; label: 'copilot')
]
