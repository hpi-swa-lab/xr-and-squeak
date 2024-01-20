Class {
	#name : #OraglePromptCountVisitor,
	#superclass : #OragleVisitor,
	#instVars : [
		'promptCount'
	],
	#category : #oRAGle
}

{
	#category : #'initialize-release',
	#'squeak_changestamp' : 'lubo 1/20/2024 00:46'
}
OraglePromptCountVisitor >> initialize [

	promptCount := 1.
]

{
	#category : #execute,
	#'squeak_changestamp' : 'lubo 1/20/2024 01:55'
}
OraglePromptCountVisitor >> value [
	
	rootModule accept: self.
	
	^ promptCount.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 00:48'
}
OraglePromptCountVisitor >> visitAlternation: aModule [

	promptCount := promptCount * aModule children size.
	self visit: aModule.
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/20/2024 00:46'
}
OraglePromptCountVisitor >> visitLeafModule: aModule [

	"no op"
]

{
	#category : #visiting,
	#'squeak_changestamp' : 'lubo 1/19/2024 21:44'
}
OraglePromptCountVisitor >> visitSequenceModule: aModule [

	self visit: aModule.
]
