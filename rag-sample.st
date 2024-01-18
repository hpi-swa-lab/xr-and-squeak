sample

prefix := {
#longPrompt -> 'You are a an expert programmer, assisting in completing code snippets. You do not add comments, only complete statements. If the given prefix to be completed is the start of a function, you may complete the entire function but only do so, if you can complete it without elision. Answer only the code that is to be inserted.'.

#noPrompt -> ''.
}.

   Module new disabled: true; title: 'abc'.

input := {
	{
		#disable -> true.
		#name -> 'JS EXAMPLE CASCADES'.
		#complete ->
'// assumes cascade of unique one-arg messages
function cascadeToMap(cascade) {
'.
		#context -> {
'
function selectorAndArgs(node) {
  return {
    selector: node.childBlocks
      .filter((s) =>
        ["keyword", "binary_operator", "unary_identifier"].includes(s.type)
      )
      .map((s) => s.sourceString)
      .join(""),
    arguments: node.childBlocks.filter(
      (s) => s.compatibleWith("expression") && s.field !== "receiver"
    ),
  };
}

function cascadedMessages(cascade) {
  return [cascade.childBlock(0), ...cascade.childBlocks.slice(1)].map(
    selectorAndArgs
  );
}
'}.
		#language -> 'javascript'
	} as: Dictionary.
	{
		#name -> 'SMALLTALK EXAMPLE HEX GRIDS'.
		#complete -> 'toIsometric: aPoint
	
	"Return a new point in isometric view"
	^ '.
		#languageKnowledge -> {#noKnowledge ->''. #someKnowledge -> ('This is a sample of Smalltalk code:\\Example>>' withCRs, Text codeSample)}.
		#context -> {
'" Smalltalk methods from the code base that are helpful: "

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
	^(x / r) @ (y / r)'}.
		#language -> 'smalltalk'
	} as: Dictionary.
}.

pipeline := [:obj |
	{
		prefix.
		{#withSamples -> {
			obj at: #languageKnowledge.
			{'The following snippets from the {1} code base may help:' format: {obj at: #language}}.
			obj at: #context}.
		 #withoutSamples -> {}}.
		{'This code is to be completed:'}.
		{obj at: #complete}
	}
].

inputs := ((input reject: [:obj | obj includesKey: 'disable']) collect: [:obj | (obj at: #name) -> pipeline]) theThing theThing theThing theThing collect: [:pair | pair key -> ((pair value gather: #yourself) joinSeparatedBy: String cr, String cr)].

(inputs concurrentCollect: [:prompt |
	prompt key -> {(SemanticConversation new
		addUserMessage: prompt value;
		getAssistantReply). prompt}]) as: Dictionary
