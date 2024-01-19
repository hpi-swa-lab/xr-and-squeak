"
OragleProjects' instance methods are ""workspaces"" that contain user code for different projects.
"
Class {
	#name : #OragleProjects,
	#superclass : #Object,
	#classVars : [
		'Server'
	],
	#category : #oRAGle,
	#'squeak_changestamp' : 'tobe 1/19/2024 07:27'
}

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'tobe 1/19/2024 07:29'
}
OragleProjects class >> startRpc [

	Server := WebServer new
		listenOn: 9823;
		addService: '/sbEval' action: [:req |
			req
			send200Response: (Compiler evaluate: req content)
			contentType: 'text/plain'
			do: [:res | res headerAt: 'Access-Control-Allow-Origin' put: '*']];
		errorHandler: [:err :request | ToolSet debugException: err];
		yourself
]

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'tobe 1/19/2024 07:29'
}
OragleProjects class >> stopRpc [

	Server ifNotNil: #destroy
]

{
	#category : #'as yet unclassified',
	#'squeak_changestamp' : 'tobe 1/19/2024 07:46'
}
OragleProjects >> copilot [

| codeSample input inputs longPrompt module prefix sample |
longPrompt := 'You are a an expert programmer, assisting in completing code snippets. You do not add comments, only complete statements. If the given prefix to be completed is the start of a function, you may complete the entire function but only do so, if you can complete it without elision. Answer only the code that is to be inserted.'.

codeSample := Text codeSample.

module := OragleSequenceModule new
	separator: String cr , String cr;
	children:
		{OragleScriptModule new children:
				{OragleSequenceModule new children:
						{OragleAlternation new children: {
								(OragleLeafModule new
									label: 'postcard';
									content: '''\\Example>>'' withCRs, codeSample';
									state: #enabled). "#enabled, #mute, #solo"
								(OragleLeafModule new
									label: 'handcrafted';
									content: 'randomMethod source';
									state: #enabled)} "#enabled, #mute, #solo"
							}}.
		OragleSequenceModule new
			label: 'completion prefix';
			disabled: false;
			separator: String cr , String cr;
			children:
				{OragleAlternation new
					children:
						(OragleLeafModule new
							content:
'toIsometric: aPoint

	"Return a new point in isometric view"
	^ ')
						state: #enabled}.
		OragleSequenceModule new
			label: 'languageKnowledge';
			disabled: false;
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
			disabled: false;
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
		}.

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
